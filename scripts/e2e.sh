#!/bin/sh
#
# End-to-end suite. Exercises the live site and the database behind it.
#
#   BASE=https://seats.lol DB_URL=postgres://... sh scripts/e2e.sh
#
# It truncates listings, clicks, rank_events and visits, so point it at a
# board you are willing to empty — never at one with paying customers on it.
#
# Not covered: completing a real payment, and the subscription.active webhook
# that follows one. Both need Polar to have enabled checkout_payments.
B="${BASE:-https://seats.lol}"
DB="${DB_URL:?set DB_URL to the Postgres connection string}"
# Optional: pin the domain to an IP when local DNS is stale.
R="${RESOLVE:-}"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); printf "  ✓ %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  ✗ %s — got %s, want %s\n" "$1" "$2" "$3"; }
is()   { [ "$2" = "$3" ] && ok "$1" || bad "$1" "$2" "$3"; }
has()  { case "$2" in *"$3"*) ok "$1";; *) bad "$1" "(missing)" "$3";; esac; }

_curl() { [ -n "$R" ] && curl --resolve "$R" "$@" || curl "$@"; }
code() { _curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }
body() { _curl -s -m 30 "$@"; }
post() { _curl -s -m 40 -X POST "$B/api/submit" -H 'content-type: application/json' -d "$1"; }

echo "── 1. routes"
for p in / /stats /archive; do is "GET $p" "$(code "$B$p")" 200; done
is "GET /manage/bogus (404)" "$(code "$B/manage/bogus")" 404
is "GET /api/icon" "$(code "$B/api/icon?domain=linear.app")" 200

echo "── 2. security"
# Payments were removed, so there is no webhook endpoint to protect.
is "snapshot cron, no token" "$(code "$B/api/cron/snapshot")" 401
is "cron, no token" "$(code "$B/api/cron/snapshot")" 401
is "cron, wrong token" "$(code "$B/api/cron/snapshot" -H 'authorization: Bearer wrong')" 401
is "icon, injection rejected" "$(_curl -s -m 20 "$B/api/icon?domain=javascript:alert(1)" -o /dev/null -w '%{content_type}')" "image/svg+xml"

echo "── 3. auth gate"
has "submit without a session" "$(post '{"name":"T","url":"vt0.com","tagline":"x","seat":5}')" "Sign in first"
is  "/submit redirects"        "$(code "$B/submit")" 307
is  "/dashboard redirects"     "$(code "$B/dashboard")" 307
is  "/signin loads"            "$(code "$B/signin")" 200

echo "── 5. lifecycle: seed → click → seat holds"
psql "$DB" -q -c "truncate listings, clicks, rank_events, visits cascade;" >/dev/null 2>&1
# Submission is behind sign-in, so the fixtures go in directly.
psql "$DB" -q -c "insert into listings (slug,name,url,domain,tagline,email,owner_email,category,seat,seat_day,status,price_cents)
  values ('alpha-e2e','Alpha','https://alpha-e2e.com','alpha-e2e.com','first','a@b.com','a@b.com','Developer Tools',1,current_date,'active',0),
         ('beta-e2e','Beta','https://beta-e2e.com','beta-e2e.com','second','b@b.com','b@b.com','Productivity',2,current_date,'active',0);" >/dev/null 2>&1
is "2 live listings" "$(psql "$DB" -tAc "select count(*) from listings where status='active'")" 2
is "2 on board" "$(psql "$DB" -tAc "select count(*) from board")" 2

SA=alpha-e2e
SB=beta-e2e
is "click redirects" "$(code "$B/r/$SA")" 302
for i in 1 2 3 4 5; do _curl -s -o /dev/null -m 15 -H "x-forwarded-for: 203.0.113.$i" "$B/r/$SA" >/dev/null; done
sleep 3
is "clicks recorded" "$(psql "$DB" -tAc "select clicks_24h from board where slug='$SA'")" 6
# Seats are owned: arrival order decides, and clicks must not move anyone.
is "seat 1 holds despite clicks" "$(psql "$DB" -tAc "select name from board order by rank limit 1")" "Alpha"

echo "── 6. features"
has "badge shows rank" "$(body "$B/api/badge/$SA")" "#1 in"
is  "UTM tagging"  "$(_curl -s -o /dev/null -m 20 -w '%{redirect_url}' "$B/r/$SB" | grep -c utm_source)" 1

echo "── 7. surfaces show data"
has "board shows clicks"    "$(body "$B/")" "clicks"
has "board shows category"  "$(body "$B/")" "Developer Tools"
has "stats shows trending"  "$(body "$B/stats")" "Alpha"
TOK=$(psql "$DB" -tAc "select manage_token from listings where domain='$SA' or domain='alpha-e2e.com' limit 1")
has "manage shows seat"     "$(body "$B/manage/$TOK")" "Seat"
has "manage shows clicks"   "$(body "$B/manage/$TOK")" "Clicks"

echo "── 8. edit and delete"
TOKA=$(psql "$DB" -tAc "select manage_token from listings where slug='alpha-e2e'")
is "edit with token"        "$(code -X PATCH "$B/api/listing" -H 'content-type: application/json' -d "{\"token\":\"$TOKA\",\"name\":\"Alpha2\",\"tagline\":\"edited\"}")" 200
is "edit with wrong token"  "$(code -X PATCH "$B/api/listing" -H 'content-type: application/json' -d '{"token":"00000000-0000-0000-0000-000000000000","name":"X","tagline":"y"}')" 404
is "delete frees the seat"  "$(code -X DELETE "$B/api/listing" -H 'content-type: application/json' -d "{\"token\":\"$TOKA\"}")" 200
is "seat released"          "$(psql "$DB" -tAc "select count(*) from board")" 1

echo "── 9. cleanup"
psql "$DB" -q -c "truncate listings, clicks, rank_events, visits cascade;" >/dev/null 2>&1
is "board empty" "$(psql "$DB" -tAc "select count(*) from board")" 0

echo
echo "════ $PASS passed, $FAIL failed"

[ "$FAIL" -eq 0 ] || exit 1

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
post() { _curl -s -m 40 -X POST "$B/api/checkout" -H 'content-type: application/json' -d "$1"; }

echo "── 1. routes"
for p in / /submit /stats; do is "GET $p" "$(code "$B$p")" 200; done
is "GET /manage/bogus (404)" "$(code "$B/manage/bogus")" 404
is "GET /api/icon" "$(code "$B/api/icon?domain=linear.app")" 200

echo "── 2. security"
is "webhook, bad signature" "$(code -X POST "$B/api/webhooks/polar" -H 'content-type: application/json' -H 'webhook-id: x' -H 'webhook-timestamp: 1' -H 'webhook-signature: v1,bogus' -d '{}')" 403
is "cron, no token" "$(code "$B/api/cron/grace")" 401
is "cron, wrong token" "$(code "$B/api/cron/grace" -H 'authorization: Bearer wrong')" 401
is "icon, injection rejected" "$(_curl -s -m 20 "$B/api/icon?domain=javascript:alert(1)" -o /dev/null -w '%{content_type}')" "image/svg+xml"

echo "── 3. input validation"
has "bad email"    "$(post '{"name":"T","url":"vt1.com","tagline":"x","email":"nope","plan":"listed"}')" "valid email"
has "bad url"      "$(post '{"name":"T","url":"not a url","tagline":"x","email":"a@b.com","plan":"listed"}')" "http(s) URL"
has "missing name" "$(post '{"url":"vt2.com","tagline":"x","email":"a@b.com","plan":"listed"}')" "Name is required"
has "long tagline" "$(post "{\"name\":\"T\",\"url\":\"vt3.com\",\"tagline\":\"$(printf 'x%.0s' $(seq 1 200))\",\"email\":\"a@b.com\",\"plan\":\"listed\"}")" "160"

echo "── 4. lifecycle: checkout → activate → click → rank"
psql "$DB" -q -c "truncate listings, clicks, rank_events, visits cascade;" >/dev/null 2>&1
has "checkout returns polar url" "$(post '{"name":"Alpha","url":"alpha-e2e.com","tagline":"first","email":"s.yaakoubi@aigcom.com","plan":"listed","category":"Developer Tools"}')" "polar.sh/checkout"
post '{"name":"Beta","url":"beta-e2e.com","tagline":"second","email":"s.yaakoubi@aigcom.com","plan":"growth","category":"Productivity"}' >/dev/null
is "2 pending listings" "$(psql "$DB" -tAc "select count(*) from listings where status='pending'")" 2
psql "$DB" -q -c "update listings set status='active' where domain like '%-e2e.com';" >/dev/null 2>&1
is "2 on board" "$(psql "$DB" -tAc "select count(*) from board")" 2

SA=$(psql "$DB" -tAc "select slug from listings where domain='alpha-e2e.com'")
SB=$(psql "$DB" -tAc "select slug from listings where domain='beta-e2e.com'")
is "click redirects" "$(code "$B/r/$SA")" 302
for i in 1 2 3 4 5; do _curl -s -o /dev/null -m 15 -H "x-forwarded-for: 203.0.113.$i" "$B/r/$SA" >/dev/null; done
sleep 3
is "clicks recorded" "$(psql "$DB" -tAc "select clicks_7d from board where slug='$SA'")" 6
is "more clicks ranks first" "$(psql "$DB" -tAc "select name from board order by rank limit 1")" "Alpha"

echo "── 5. plan gating"
has "growth badge shows rank" "$(body "$B/api/badge/$SB")" "#1 in"
has "listed badge is honest"  "$(body "$B/api/badge/$SA")" "listed"
is  "growth gets UTM"  "$(_curl -s -o /dev/null -m 20 -w '%{redirect_url}' "$B/r/$SB" | grep -c utm_source)" 1
is  "listed gets none" "$(_curl -s -o /dev/null -m 20 -w '%{redirect_url}' "$B/r/$SA" | grep -c utm_source)" 0

echo "── 6. dedupe"
has "same domain refused" "$(post '{"name":"Dup","url":"https://alpha-e2e.com","tagline":"x","email":"a@b.com","plan":"listed"}')" "already on the board"
has "www variant refused" "$(post '{"name":"Dup","url":"www.alpha-e2e.com","tagline":"x","email":"a@b.com","plan":"listed"}')" "already on the board"

echo "── 7. surfaces show data"
has "board shows clicks"    "$(body "$B/")" "clicks"
has "board shows category"  "$(body "$B/")" "Developer Tools"
has "stats shows trending"  "$(body "$B/stats")" "Alpha"
TOK=$(psql "$DB" -tAc "select manage_token from listings where domain='$SA' or domain='alpha-e2e.com' limit 1")
has "manage shows seat"     "$(body "$B/manage/$TOK")" "Seat"
has "manage shows cpc"      "$(body "$B/manage/$TOK")" "Cost per click"

echo "── 8. cleanup"
psql "$DB" -q -c "truncate listings, clicks, rank_events, visits cascade;" >/dev/null 2>&1
is "board empty" "$(psql "$DB" -tAc "select count(*) from board")" 0

echo
echo "════ $PASS passed, $FAIL failed"

[ "$FAIL" -eq 0 ] || exit 1

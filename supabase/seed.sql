-- Local demo data. Applied by `supabase db reset` — never runs in production.
-- Prices follow the power law a real board settles into: a few big payers up
-- top, a long tail sitting at the floor.

do $$
declare
  demo   text[][] := array[
    ['Linear',      'linear.app',      'Purpose-built tool for planning and building products.',            '149900'],
    ['Resend',      'resend.com',      'Email for developers. Send transactional email with an API.',        '99900'],
    ['Cal.com',     'cal.com',         'Scheduling infrastructure for absolutely everyone.',                 '74900'],
    ['Supabase',    'supabase.com',    'The open source Firebase alternative. Postgres, auth, storage.',     '54900'],
    ['Polar',       'polar.sh',        'Payment infrastructure for developers. Merchant of record.',          '39900'],
    ['Railway',     'railway.app',     'Deploy anything. Infrastructure that scales with a single command.',  '29900'],
    ['Tinybird',    'tinybird.co',     'Build fast analytics APIs over billions of rows of data.',            '21900'],
    ['Trigger.dev', 'trigger.dev',     'Background jobs and AI infrastructure without managing servers.',     '16900'],
    ['Neon',        'neon.tech',       'Serverless Postgres with branching. Spin up a database in seconds.',  '12900'],
    ['Clerk',       'clerk.com',       'Authentication and user management that takes minutes to add.',       '9900'],
    ['Upstash',     'upstash.com',     'Serverless Redis and Kafka, priced per request.',                     '7900'],
    ['Vercel',      'vercel.com',      'The frontend cloud. Deploy from git in seconds.',                     '5900'],
    ['Bun',         'bun.sh',          'Fast all-in-one JavaScript runtime, bundler and package manager.',    '4900'],
    ['Turso',       'turso.tech',      'SQLite for production. Replicated to the edge, close to your users.', '3900'],
    ['Val Town',    'val.town',        'Write and deploy TypeScript functions from the browser.',             '3900'],
    ['Warp',        'warp.dev',        'The terminal reimagined, with AI and collaboration built in.',        '2900'],
    ['Raycast',     'raycast.com',     'A blazingly fast, extendable launcher for macOS.',                    '2900'],
    ['Fly.io',      'fly.io',          'Deploy app servers close to your users, in 30+ regions.',             '2900']
  ];
  i      int;
  lid    uuid;
  cents  int;
begin
  for i in 1 .. array_length(demo, 1) loop
    cents := demo[i][4]::int;

    insert into listings (slug, name, url, domain, tagline, email, price_cents)
    values (
      lower(regexp_replace(demo[i][1], '[^a-zA-Z0-9]+', '-', 'g')) || '-demo',
      demo[i][1],
      'https://' || demo[i][2],
      demo[i][2],
      demo[i][3],
      'demo@example.com',
      cents
    )
    returning id into lid;

    perform activate_listing(lid, cents, 'sub_demo_' || i, 'cus_demo_' || i, 'prod_demo_' || cents);

    -- Clicks roughly track price, with enough noise to look real.
    insert into clicks (listing_id, created_at, ip_hash)
    select
      lid,
      now() - (random() * interval '30 days'),
      md5(random()::text)
    from generate_series(1, greatest(5, (cents / 100 * (0.4 + random()))::int));
  end loop;
end $$;

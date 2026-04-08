#!/usr/bin/env tsx
// Seed script — populates the DB with curator + creator data for MVP.
// Usage:
//   pnpm tsx supabase/seed.ts          # upsert (idempotent)
//   pnpm tsx supabase/seed.ts --reset  # truncate then re-seed

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ADMIN_AUTH_ID = process.env.SEED_ADMIN_AUTH_ID ?? ""; // set after first login

const ACCOUNTS = [
  {
    handle: "karpathy",
    display_name: "Andrej Karpathy",
    bio: "AI researcher. ex OpenAI, Tesla. Building EurekaLabsAI.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1296667294148382721/9Pr6XrPB_400x400.jpg",
  },
  {
    handle: "ylecun",
    display_name: "Yann LeCun",
    bio: "VP & Chief AI Scientist at Meta. Professor at NYU.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1441162863894683654/2WA3pY0D_400x400.jpg",
  },
  {
    handle: "sama",
    display_name: "Sam Altman",
    bio: "CEO at OpenAI.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/804990426455887872/BG0Xh7Oa_400x400.jpg",
  },
  {
    handle: "geohot",
    display_name: "George Hotz",
    bio: "comma.ai / tinygrad. Hardware hacker.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/888197979747401729/wCJFzBfq_400x400.jpg",
  },
  {
    handle: "levelsio",
    display_name: "Pieter Levels",
    bio: "Building internet businesses. $4.7M ARR, bootstrapped.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1633691839582281729/G6KnpMni_400x400.jpg",
  },
  {
    handle: "marc_louvion",
    display_name: "Marc Lou",
    bio: "Shipping SaaS products fast. Indie hacker.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1683375003557318656/0pT25lmM_400x400.jpg",
  },
  {
    handle: "naval",
    display_name: "Naval",
    bio: "AngelList. Wealth, not money.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1256835784549998596/TOrQM-V1_400x400.jpg",
  },
  {
    handle: "kk",
    display_name: "Kevin Kelly",
    bio: "Senior Maverick at Wired. Author of The Inevitable, Cool Tools.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/631398378/KK_Cropped-for-Twitter_400x400.jpg",
  },
  {
    handle: "paulg",
    display_name: "Paul Graham",
    bio: "YC founder. Writing essays. Lisp.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/1824002576/pg-railsconf_400x400.jpg",
  },
  {
    handle: "balajis",
    display_name: "Balaji Srinivasan",
    bio: "Former CTO of Coinbase, GP at a16z.",
    avatar_url:
      "https://pbs.twimg.com/profile_images/897435232399589378/dDWOSNNb_400x400.jpg",
  },
];

type TweetSeed = {
  twitter_id: string;
  text: string;
  published_at: string;
  media_urls?: string[];
};

const TWEETS: Record<string, TweetSeed[]> = {
  karpathy: [
    {
      twitter_id: "seed_karpathy_1",
      text: "The hottest new programming language is English.",
      published_at: "2024-11-15T14:00:00Z",
    },
    {
      twitter_id: "seed_karpathy_2",
      text: "Neural nets are not 'just' statistics any more than a human brain is 'just' chemistry. The reduction is technically true but misses everything interesting.",
      published_at: "2024-11-10T09:30:00Z",
    },
    {
      twitter_id: "seed_karpathy_3",
      text: "Spent the weekend re-implementing a small GPT from scratch in pure NumPy. Still magical every time the loss goes down.",
      published_at: "2024-10-28T18:30:00Z",
    },
    {
      twitter_id: "seed_karpathy_4",
      text: "Softmax is just argmax but differentiable. Once you see it, you see it everywhere.",
      published_at: "2024-10-15T11:00:00Z",
    },
    {
      twitter_id: "seed_karpathy_5",
      text: "The best way to understand a paper is to reimplement it. Reading alone gives you the illusion of understanding.",
      published_at: "2024-09-20T16:45:00Z",
    },
  ],
  ylecun: [
    {
      twitter_id: "seed_ylecun_1",
      text: "Autoregressive LLMs are not going to lead to AGI. We need a fundamentally different approach that can reason, plan, and learn from the world like humans do.",
      published_at: "2024-11-12T10:00:00Z",
    },
    {
      twitter_id: "seed_ylecun_2",
      text: "The most important unsolved problem in AI: how do machines learn like babies — acquiring a model of the world through observation and interaction.",
      published_at: "2024-11-05T14:00:00Z",
    },
    {
      twitter_id: "seed_ylecun_3",
      text: "Convolutional nets were inspired by the visual cortex. The lesson: look to neuroscience for architectural ideas, not for implementation details.",
      published_at: "2024-10-22T09:00:00Z",
    },
    {
      twitter_id: "seed_ylecun_4",
      text: "Intelligence is the ability to predict. All learning systems, whether biological or artificial, are fundamentally prediction machines.",
      published_at: "2024-09-30T13:00:00Z",
    },
  ],
  sama: [
    {
      twitter_id: "seed_sama_1",
      text: "Intelligence too cheap to meter changes everything. We haven't even begun to imagine the downstream effects.",
      published_at: "2024-11-14T11:00:00Z",
    },
    {
      twitter_id: "seed_sama_2",
      text: "The most important question in tech right now: what happens to the labor market when AI can do most cognitive work? We need to figure this out together.",
      published_at: "2024-11-08T09:00:00Z",
    },
    {
      twitter_id: "seed_sama_3",
      text: "Compounding is the most powerful force in the universe. This applies to wealth, knowledge, relationships, and now AI capabilities.",
      published_at: "2024-10-30T17:00:00Z",
    },
    {
      twitter_id: "seed_sama_4",
      text: "The models are getting better faster than most people realize. Every 6 months the delta is significant.",
      published_at: "2024-10-12T10:00:00Z",
    },
  ],
  geohot: [
    {
      twitter_id: "seed_geohot_1",
      text: "tinygrad hit 1000 stars. It's a tensor library in ~1000 lines of Python. Every operation is just a lazy graph of buffers.",
      published_at: "2024-11-13T15:00:00Z",
    },
    {
      twitter_id: "seed_geohot_2",
      text: "The secret to hardware is that it's just software that's slow to compile.",
      published_at: "2024-11-01T10:00:00Z",
    },
    {
      twitter_id: "seed_geohot_3",
      text: "Compilers are underrated. Most programmers think in terms of what they want the computer to do. Compiler writers think in terms of what the hardware can do. Huge difference.",
      published_at: "2024-10-18T12:00:00Z",
    },
  ],
  levelsio: [
    {
      twitter_id: "seed_levelsio_1",
      text: "Revenue: $4.7M ARR. 0 employees. No VC. Just shipping. This is my 2024 report.",
      published_at: "2024-11-13T12:00:00Z",
    },
    {
      twitter_id: "seed_levelsio_2",
      text: "The best marketing is a great product that solves a real problem. Ship it, talk to users, iterate. Stop optimizing for Twitter engagement.",
      published_at: "2024-11-08T09:00:00Z",
    },
    {
      twitter_id: "seed_levelsio_3",
      text: "Distribution beats product. A mediocre product with great distribution beats a great product with no distribution every time.",
      published_at: "2024-10-25T14:00:00Z",
    },
    {
      twitter_id: "seed_levelsio_4",
      text: "Nomad life hack: book a furnished apartment for a month, not a hotel. 3x cheaper, feels like home, actually productive.",
      published_at: "2024-10-10T08:00:00Z",
    },
  ],
  marc_louvion: [
    {
      twitter_id: "seed_marc_1",
      text: "Built and launched 3 products this month. 2 failed immediately. 1 is doing $800 MRR after 2 weeks. You don't know which will work until you ship.",
      published_at: "2024-11-10T14:00:00Z",
    },
    {
      twitter_id: "seed_marc_2",
      text: "The indie hacker meta in 2024: Next.js + Supabase + Stripe + Resend. You can build most SaaS ideas in a weekend with this stack.",
      published_at: "2024-11-03T10:00:00Z",
    },
    {
      twitter_id: "seed_marc_3",
      text: "Lesson from 20 failed products: the problem wasn't the idea or the code. It was failing to talk to users before building.",
      published_at: "2024-10-22T16:00:00Z",
    },
  ],
  naval: [
    {
      twitter_id: "seed_naval_1",
      text: "Specific knowledge is knowledge that you cannot be trained for. If society can train you, it can train someone else and replace you.",
      published_at: "2024-11-12T11:00:00Z",
    },
    {
      twitter_id: "seed_naval_2",
      text: "Read what you love until you love to read.",
      published_at: "2024-11-01T08:00:00Z",
    },
    {
      twitter_id: "seed_naval_3",
      text: "The most important skill for getting rich is becoming a perpetual learner. The world is changing fast enough that yesterday's knowledge is a liability.",
      published_at: "2024-10-20T16:00:00Z",
    },
    {
      twitter_id: "seed_naval_4",
      text: "A calm mind, a fit body, and a house full of love. These things cannot be bought. They must be earned.",
      published_at: "2024-10-08T09:00:00Z",
    },
    {
      twitter_id: "seed_naval_5",
      text: "Desire is a contract that you make with yourself to be unhappy until you get what you want.",
      published_at: "2024-09-25T14:00:00Z",
    },
  ],
  kk: [
    {
      twitter_id: "seed_kk_1",
      text: "Every technology that exists today will be obsolete in 25 years. Every technology that exists in 25 years will seem like magic today.",
      published_at: "2024-11-11T10:00:00Z",
    },
    {
      twitter_id: "seed_kk_2",
      text: "The internet is the world's largest library. It's just that all the books are on the floor.",
      published_at: "2024-10-30T14:00:00Z",
    },
    {
      twitter_id: "seed_kk_3",
      text: "Protopia: a state that is better today than yesterday, though not perfect. A slow process of continuous improvement. This is actually achievable.",
      published_at: "2024-10-15T09:00:00Z",
    },
    {
      twitter_id: "seed_kk_4",
      text: "The secret to making a movie: the script is never done. You shoot, cut, learn, reshoot. Creation is always iterative, never linear.",
      published_at: "2024-09-28T13:00:00Z",
    },
  ],
  paulg: [
    {
      twitter_id: "seed_paulg_1",
      text: "The way to get startup ideas is not to try to think of startup ideas. It's to look for problems, preferably problems you have yourself.",
      published_at: "2024-11-14T10:00:00Z",
    },
    {
      twitter_id: "seed_paulg_2",
      text: "It's not that successful people are workaholics. It's that they can't distinguish between work and play.",
      published_at: "2024-11-05T14:00:00Z",
    },
    {
      twitter_id: "seed_paulg_3",
      text: "The best startups are almost never described as good ideas to the investors who funded them. They seemed like bad ideas that turned out to be good.",
      published_at: "2024-10-25T11:00:00Z",
    },
    {
      twitter_id: "seed_paulg_4",
      text: "Live in the future, then build what's missing.",
      published_at: "2024-10-10T09:00:00Z",
    },
  ],
  balajis: [
    {
      twitter_id: "seed_balajis_1",
      text: "The most important thing about the internet is that it lets you find the other people in the world who think like you do.",
      published_at: "2024-11-12T12:00:00Z",
    },
    {
      twitter_id: "seed_balajis_2",
      text: "Exit over voice. Builders over bureaucrats. Code over committees. The next decade will sort out who believed this.",
      published_at: "2024-11-02T10:00:00Z",
    },
    {
      twitter_id: "seed_balajis_3",
      text: "The network state: a highly aligned online community that crowdfunds territory to become a real country. This will happen within 30 years.",
      published_at: "2024-10-18T16:00:00Z",
    },
  ],
};

const PLAYLISTS = [
  {
    name: "AI Researchers",
    slug: "ai-researchers",
    cover_emoji: "🧠",
    description:
      "Leading minds in artificial intelligence and machine learning — from theory to practice.",
    accounts: ["karpathy", "ylecun", "sama", "geohot"],
  },
  {
    name: "Indie Hackers",
    slug: "indie-hackers",
    cover_emoji: "🚀",
    description:
      "Builders shipping products solo, growing revenue without VC, sharing the journey.",
    accounts: ["levelsio", "marc_louvion"],
  },
  {
    name: "Philosophy & Ideas",
    slug: "philosophy-ideas",
    cover_emoji: "💡",
    description:
      "Big ideas, mental models, long-form thinking, and uncommon wisdom.",
    accounts: ["naval", "kk", "paulg"],
  },
  {
    name: "Tech Founders",
    slug: "tech-founders",
    cover_emoji: "⚡",
    description:
      "Operators and founders building at the frontier of technology.",
    accounts: ["sama", "balajis", "paulg"],
  },
];

async function reset() {
  console.log("🗑  Resetting seed data...");
  // Order matters: tweets → playlist_accounts → playlists → twitter_accounts
  // Users and subscriptions are left intact
  await supabase.from("tweets").delete().like("twitter_id", "seed_%");
  const { data: accounts } = await supabase
    .from("twitter_accounts")
    .select("id")
    .in("handle", ACCOUNTS.map((a) => a.handle));
  if (accounts?.length) {
    const ids = accounts.map((a) => a.id);
    await supabase.from("playlist_accounts").delete().in("twitter_account_id", ids);
  }
  const { data: playlists } = await supabase
    .from("playlists")
    .select("id")
    .in("slug", PLAYLISTS.map((p) => p.slug));
  if (playlists?.length) {
    await supabase
      .from("playlists")
      .delete()
      .in("id", playlists.map((p) => p.id));
  }
  await supabase
    .from("twitter_accounts")
    .delete()
    .in("handle", ACCOUNTS.map((a) => a.handle));
  console.log("✅ Reset complete");
}

async function seed() {
  console.log("🌱 Seeding twitter_accounts...");
  const { error: accountsError } = await supabase
    .from("twitter_accounts")
    .upsert(ACCOUNTS, { onConflict: "handle", ignoreDuplicates: true });
  if (accountsError) {
    console.error("Error seeding accounts:", accountsError.message);
    process.exit(1);
  }

  // Fetch inserted account IDs
  const { data: insertedAccounts } = await supabase
    .from("twitter_accounts")
    .select("id, handle")
    .in("handle", ACCOUNTS.map((a) => a.handle));

  const accountMap = new Map(
    (insertedAccounts ?? []).map((a) => [a.handle, a.id])
  );

  console.log("🌱 Seeding tweets...");
  for (const [handle, tweets] of Object.entries(TWEETS)) {
    const accountId = accountMap.get(handle);
    if (!accountId) {
      console.warn(`  ⚠ No account found for handle: ${handle}`);
      continue;
    }
    const rows = tweets.map((t) => ({
      twitter_account_id: accountId,
      twitter_id: t.twitter_id,
      text: t.text,
      media_urls: t.media_urls ?? [],
      published_at: t.published_at,
    }));
    const { error } = await supabase
      .from("tweets")
      .upsert(rows, { onConflict: "twitter_id", ignoreDuplicates: true });
    if (error) console.warn(`  ⚠ Tweets error for ${handle}:`, error.message);
    else console.log(`  ✓ ${handle} (${rows.length} tweets)`);
  }

  // Resolve admin user
  let adminUserId: string | null = null;
  if (ADMIN_AUTH_ID) {
    const { data: adminUser } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", ADMIN_AUTH_ID)
      .single();
    adminUserId = adminUser?.id ?? null;
  }
  if (!adminUserId) {
    // Use first user in the table as fallback
    const { data: firstUser } = await supabase
      .from("users")
      .select("id")
      .order("created_at")
      .limit(1)
      .single();
    adminUserId = firstUser?.id ?? null;
  }
  if (!adminUserId) {
    console.warn(
      "⚠ No users found in DB. Playlists will be seeded after first login.\n  Set SEED_ADMIN_AUTH_ID in .env.local and re-run the seed."
    );
    console.log("\n✅ Seed complete (accounts + tweets only)");
    return;
  }

  console.log("🌱 Seeding playlists...");
  for (const playlist of PLAYLISTS) {
    // Upsert playlist
    const { data: pl, error: plError } = await supabase
      .from("playlists")
      .upsert(
        {
          curator_id: adminUserId,
          name: playlist.name,
          slug: playlist.slug,
          cover_emoji: playlist.cover_emoji,
          description: playlist.description,
          is_public: true,
        },
        { onConflict: "slug" }
      )
      .select("id")
      .single();

    if (plError || !pl) {
      console.warn(`  ⚠ Playlist error for ${playlist.slug}:`, plError?.message);
      continue;
    }

    // Link accounts
    const accountIds = playlist.accounts
      .map((h) => accountMap.get(h))
      .filter((id): id is string => Boolean(id));

    const junctionRows = accountIds.map((twitter_account_id) => ({
      playlist_id: pl.id,
      twitter_account_id,
    }));

    await supabase
      .from("playlist_accounts")
      .upsert(junctionRows, { onConflict: "playlist_id,twitter_account_id", ignoreDuplicates: true });

    console.log(
      `  ✓ ${playlist.cover_emoji} ${playlist.name} (${accountIds.length} accounts)`
    );
  }

  console.log("\n✅ Seed complete!");
  console.log("Next: log in at /login and run seed again to link playlists to your account.");
}

async function main() {
  const shouldReset = process.argv.includes("--reset");
  if (shouldReset) await reset();
  await seed();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

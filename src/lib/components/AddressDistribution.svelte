<script lang="ts">
  import { onMount } from "svelte";

  import { cn } from "$lib/utils";

  type TierData = {
    tier: number;
    count: number;
    amount: number;
    change?: number; // Added change field
    icon?: string; // For image icons
  };

  let tiers = $state<TierData[]>([]);
  let error = $state<string | null>(null);
  let isLoading = $state(true);

  type TierConfig = {
    name: string;
    emoji: string;
    threshold: number;
    label: string;
    icon?: string;
  };

  // Marine Life Tiers configuration (Ordered from largest to smallest for display)
  const TIER_CONFIG: TierConfig[] = [
    {
      name: "Aquaman",
      emoji: "🧜‍♂️",
      threshold: 1_000_000_000,
      label: "1 mia.",
    },
    {
      name: "Humpback",
      emoji: "🐋",
      threshold: 100_000_000,
      label: "100 mio.",
    },
    { name: "Whale", emoji: "🐳", threshold: 10_000_000, label: "10 mio." },
    { name: "Shark", emoji: "🦈", threshold: 1_000_000, label: "1 mio." },
    { name: "Dolphin", emoji: "🐬", threshold: 100_000, label: "100 t" },
    { name: "Fish", emoji: "🐟", threshold: 10_000, label: "10 t" },
    { name: "Octopus", emoji: "🐙", threshold: 1_000, label: "1 t" },
    { name: "Crab", emoji: "🦀", threshold: 100, label: "100" },
  ];

  async function fetchDistribution() {
    try {
      // Fetch distribution from API
      // Note: 'limit=2' was failing with 400, but 'limit=24' works. We fetch 24 and use the first 2.
      const res = await fetch(
        "https://api.kaspa.org/addresses/distribution?limit=24",
      );
      const data = await res.json();

      // Ensure we have an array
      const snapshots = Array.isArray(data) ? data : [data];

      if (snapshots.length === 0 || !snapshots[0].tiers) {
        // If empty or invalid structure, just return (or handle error gracefully)
        console.warn("AddressDistribution: No valid tiers data found");
        tiers = [];
        isLoading = false;
        return;
      }

      const currentTiers: any[] = snapshots[0].tiers;
      const prevTiers: any[] = snapshots.length > 1 ? snapshots[1].tiers : [];

      // Map API tiers to our structure and calculate change
      tiers = currentTiers
        .map((tier: any) => {
          // Find matching tier in previous snapshot
          const prevTier = prevTiers.find((p: any) => p.tier === tier.tier);
          // Calculate change only if we have a previous tier to compare with
          const change = prevTier ? tier.count - prevTier.count : 0;

          return {
            ...tier,
            change: prevTier ? change : undefined, // Mark as undefined if no history available
          };
        })
        .filter((t) => t.tier >= 3); // Filter out Plankton(0), Oyster(1), Shrimp(2)
    } catch (e: any) {
      error = "Failed to fetch distribution data: " + e.message;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchDistribution();
  });

  function getTierConfig(apiTier: number) {
    const map = [
      "Plankton",
      "Oyster",
      "Shrimp",
      "Crab",
      "Octopus",
      "Fish",
      "Dolphin",
      "Shark",
      "Whale",
      "Humpback",
      "Aquaman",
    ];

    const name = map[apiTier] || "Unknown";
    return (
      TIER_CONFIG.find((t) => t.name === name) || {
        name,
        emoji: "❓",
        label: "?",
        icon: undefined, // Explicitly undefined to match union type
        threshold: 0, // Add missing required properties if needed for strict typing
      }
    );
  }

  function formatKAS(amount: number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      amount,
    );
  }

  function formatChange(change: number | undefined) {
    if (change === undefined || change === 0) return "-";
    return change > 0 ? `+${change}` : `${change}`;
  }

  function getChangeColor(change: number | undefined) {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  }
</script>

<div class="card w-full">
  <div class="card-header">
    <h2 class="card-title">Address Distribution (Rich List)</h2>
  </div>
  <div class="card-content">
    {#if error}
      <div class="error-msg">{error}</div>
    {:else if isLoading}
      <div class="loading-msg">Loading distribution data...</div>
    {:else}
      <div class="table-container">
        <table class="responsive-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th class="text-right">Min. Holdings</th>
              <th class="text-right">Address Count</th>
              <th class="text-right">24h Change</th>
              <th class="text-right">
                <div class="amount-wrapper">Total Usage</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {#each [...tiers].reverse() as tier}
              {@const config = getTierConfig(tier.tier)}
              <tr>
                <!-- Tier Name + Icon -->
                <td data-label="Tier">
                  <div class="tier-info">
                    <div class="icon-wrapper">
                      {#if config.icon}
                        <img
                          src={config.icon}
                          alt={config.name}
                          class="tier-icon"
                        />
                      {:else}
                        <span class="tier-emoji">{config.emoji}</span>
                      {/if}
                    </div>
                    <span class="tier-name">{config.name}</span>
                  </div>
                </td>

                <!-- Label -->
                <td data-label="Min. Holdings" class="text-right text-muted">
                  {config.label}
                </td>

                <!-- Count -->
                <td data-label="Count" class="text-right font-mono">
                  {tier.count.toLocaleString()}
                </td>

                <!-- Change -->
                <td
                  data-label="24h Change"
                  class={cn(
                    "text-right font-mono font-medium",
                    getChangeColor(tier.change),
                  )}
                >
                  {formatChange(tier.change)}
                </td>

                <!-- Total Amount -->
                <td data-label="Total Holdings" class="text-right">
                  <div class="amount-wrapper">
                    <span class="amount-value">
                      {formatKAS(tier.amount)}
                    </span>
                    <span class="currency-label">KAS</span>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Base Styles (Desktop Default) */
  .card {
    background: #18181b; /* zinc-900 */
    border: 1px solid #27272a; /* zinc-800 */
    border-radius: 0.75rem;
    overflow: hidden;
    color: #e4e4e7; /* zinc-200 */
  }

  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid #27272a;
  }

  .card-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .card-content {
    padding: 0;
  }

  .error-msg {
    color: #ef4444;
    padding: 1.5rem;
  }
  .loading-msg {
    color: #a1a1aa;
    padding: 2rem;
    text-align: center;
  }

  /* Table Styles */
  .table-container {
    width: 100%;
    overflow-x: auto;
  }

  .responsive-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .responsive-table th,
  .responsive-table td {
    padding: 1rem 1.5rem;
    text-align: left;
    border-bottom: 1px solid #27272a30;
  }

  .responsive-table th {
    background: #18181b;
    color: #71717a; /* zinc-500 */
    text-transform: uppercase;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .responsive-table tr:last-child td {
    border-bottom: none;
  }

  .responsive-table tbody tr:hover {
    background: rgba(39, 39, 42, 0.3); /* zinc-800 with opacity */
  }

  /* Helpers */
  .text-right {
    text-align: right !important;
  }
  .text-muted {
    color: #a1a1aa;
    font-family: monospace;
  }
  .font-mono {
    font-family: monospace;
  }
  .font-medium {
    font-weight: 500;
  }

  .text-green-500 {
    color: #22c55e;
  }
  .text-red-500 {
    color: #ef4444;
  }
  .text-muted-foreground {
    color: #71717a;
  }

  .tier-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: #09090b; /* zinc-950 */
    border: 1px solid #27272a;
    border-radius: 9999px;
  }
  .tier-icon {
    width: 1.25rem;
    height: 1.25rem;
    object-fit: contain;
    filter: invert(1);
  }
  .tier-emoji {
    font-size: 1.125rem;
    line-height: 1;
  }
  .tier-name {
    font-weight: 700;
    color: #e4e4e7;
  }

  .amount-wrapper {
    display: flex;
    width: 100%; /* Ensure full width for alignment */
    align-items: baseline;
    justify-content: flex-end;
    gap: 0.25rem;
  }
  .amount-value {
    background: linear-gradient(to right, #f4f4f5, #a1a1aa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 500;
    font-family: monospace;
  }
  .currency-label {
    font-size: 0.625rem;
    color: #71717a;
    font-weight: 500;
  }

  /* --------------------------------------------------------- */
  /* MOBILE TRANSFORMATION (The Logic for Supertypo)           */
  /* --------------------------------------------------------- */
  @media (max-width: 768px) {
    /* 1. Force everything to block display */
    .responsive-table,
    .responsive-table thead,
    .responsive-table tbody,
    .responsive-table th,
    .responsive-table td,
    .responsive-table tr {
      display: block;
    }

    /* 2. Hide Headers */
    .responsive-table thead {
      display: none;
    }

    /* 3. Style Row as Card */
    .responsive-table tr {
      margin: 1rem;
      border: 1px solid #3f3f46; /* Lighter border on mobile for visibility */
      border-radius: 0.75rem;
      background: #18181b50;
      padding: 0;
      overflow: hidden;
    }

    /* 4. Style Cells as Data Rows */
    .responsive-table td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: none;
      /* removed border-bottom */
      position: relative;
      padding: 0.5rem 1rem; /* reduced vertical padding slightly since no borders */
      text-align: right;
    }

    .responsive-table td:last-child {
      border-bottom: none;
    }

    /* 5. Inject Labels via data-label */
    .responsive-table td::before {
      content: attr(data-label);
      font-weight: 600;
      color: #71717a;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    /* Special fix for the Tier Name row to make it look like a Header */
    .responsive-table td[data-label="Tier"] {
      background: #27272a50;
      justify-content: flex-start; /* Left align title */
    }
    .responsive-table td[data-label="Tier"]::before {
      display: none; /* Hide "Tier" label, the icon is enough */
    }

    /* Helpers tweaks for mobile */
    .text-right {
      text-align: right;
    } /* Reset */
    .amount-wrapper {
      justify-content: flex-end;
    }
  }
</style>

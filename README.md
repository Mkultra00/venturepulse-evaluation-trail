# Venturepulse Evaluation Trail

read and give me your opinion on this to build a hackathon tool. so that vc and investpors can evaluate startup founders with a time sequence fame so that kpi and evals can dynamically chang. Use the visualization for showing agentic flow and tool use and th operation workflow for hleping explain where in the process the applicants are . there should be a report cart alpong with the time since last evaluatd . create a demo mode with a synthetic startup to show and demo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://venturepulse-evaluation-trail.lovable.app

## How the sample datasets use Akta

The 7 sample applicants (Cinderwell, Haulmark, Ledgerline, Parcelwise, Quillstack, Tessellate Bio, Vantor) are fictional, but they're grounded in real public-record data from [akta.pro](https://akta.pro) (hackathon sponsor).

- **Real companies, one per archetype.** We pulled raw Akta company-enrichment responses (`GET /api/v1/company/enrichment/`, 2026-10-24) for five real companies, each mirroring a fictional applicant:

  | Real company | Mirrors | Headcount | Rev est. | Val est. |
  |---|---|---|---|---|
  | Vic.ai (AP automation) | Ledgerline | 51-100 | $25-50M | $250-500M |
  | Pallet (freight back-office AI) | Haulmark | 101-250 | $10-25M | $100-250M |
  | Togal.AI (construction takeoff) | Cinderwell | 11-50 | $5-10M | $50-100M |
  | Sixfold AI (insurance underwriting) | Quillstack | 51-100 | $10-25M | $100-250M |
  | Rillet (AI ERP / rev-rec) | Vantor | 101-250 | $25-50M | $500M-1B |

- **Sections used:** firmographic, management_profile, financial_estimate, digital_presence, strategic_signal, trust_signal. (`funding_detail` isn't on the hackathon plan; funding rounds still appear in `strategic_signal.scale_indicator`.)
- **Wired in as competitor evidence** on the market and defensibility dimensions (`source_type: akta_company_enrichment`). Example: Ledgerline claims a moat from 40M invoices, while Vic.ai, a real incumbent, claims hundreds of millions.
- **Every signal cites its source URLs**, so evidence in the report card can link back to it.
- **Real contradiction to catch:** Vic.ai's signals say "previously bootstrapped without venture capital" right next to a $52M Series C — the kind of source conflict DoughDilly's verifier flags.

Akta API notes: `x-api-key` header; search with `GET /api/v1/company/search/?query=<name>` to get a uuid; enrichment accepts a uuid or domain (`?company=ramp.com&sections=a,b`); 25 requests/min, each section metered. The key is not stored in this repo.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/edac68c8-a605-4065-beb5-7759528ba768).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

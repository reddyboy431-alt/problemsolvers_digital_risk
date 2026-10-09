# BrandShield AI short demo

## Two-minute walkthrough

1. **Introduce the problem.** BrandShield AI helps protect a brand from fake social profiles, scam pages, and impersonating mobile apps.
2. **Set the ground truth.** Open **Brand profile** and review the official social handles and app-store listings. Mention that official assets are allowlisted before scoring.
3. **Review findings.** Open **Overview** or **Threats** to see social and app-store candidates, risk tiers, search, and source filters.
4. **Explain a detection.** Select the information icon on a finding. Walk through the score evidence: look-alike spelling, claimed logo, suspicious publisher, brand description, and scam cues.
5. **Show false-positive control.** Note that the legitimate social account and legitimate store app are present in the sample source data but excluded from the results.
6. **Test the profile.** Edit an official account or app package ID, save, and observe the allowlist update. All results are recalculated locally.
7. **Close with limitations.** Open **Architecture & demo** to show the pipeline and disclose that sources are fixtures, not live platform integrations.

## Demo safety note

All profiles, applications, scores, metrics, and detection timestamps in this build are synthetic examples. Do not treat a sample finding as a real accusation or as evidence that a platform was scanned.

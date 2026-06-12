import { runPrivacyRetentionJob } from "../src/lib/privacy/retention-service";

async function main() {
  const result = await runPrivacyRetentionJob({
    actorRole: "system"
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

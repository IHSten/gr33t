# Workers Analytics Engine — the product/event analytics store (EVENTS binding).
#
# Unlike D1, KV, and R2, an Analytics Engine dataset is NOT a provisionable
# resource: the Cloudflare Terraform provider (v5) exposes no
# `cloudflare_analytics_engine_dataset`, and the platform creates a dataset
# implicitly on the Worker's first `writeDataPoint()`. A dataset is referenced
# by name only — like the R2 bucket name, not like the D1/KV ids that Terraform
# generates and we inject into wrangler.toml.
#
# There is therefore nothing to `resource`-provision here. We still capture the
# dataset in IaC as the single source of truth for its name, which must match
# worker/wrangler.toml -> [[analytics_engine_datasets]] dataset (see the EVENTS
# binding). Retention is a fixed ~90 days on the platform and is not
# configurable via Terraform.
locals {
  analytics_engine_dataset = var.analytics_engine_dataset_name
}

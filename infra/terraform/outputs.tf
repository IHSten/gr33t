output "d1_database_id" {
  description = "D1 database id -> worker/wrangler.toml [[d1_databases]] database_id."
  value       = cloudflare_d1_database.gr33t.id
}

output "d1_database_name" {
  value = cloudflare_d1_database.gr33t.name
}

output "kv_namespace_id" {
  description = "KV namespace id -> worker/wrangler.toml [[kv_namespaces]] id (SESSIONS)."
  value       = cloudflare_workers_kv_namespace.sessions.id
}

output "card_cache_kv_namespace_id" {
  description = "KV namespace id -> worker/wrangler.toml [[kv_namespaces]] id (CARD_CACHE)."
  value       = cloudflare_workers_kv_namespace.card_cache.id
}

output "r2_bucket_name" {
  description = "R2 bucket name -> worker/wrangler.toml [[r2_buckets]] bucket_name (IMAGES)."
  value       = cloudflare_r2_bucket.images.name
}

output "analytics_engine_dataset" {
  description = "Analytics Engine dataset name -> worker/wrangler.toml [[analytics_engine_datasets]] dataset (EVENTS). Created on first write; there is no Terraform resource to provision."
  value       = local.analytics_engine_dataset
}

output "pages_project_name" {
  description = "Pages project name -> `wrangler pages deploy --project-name`."
  value       = cloudflare_pages_project.web.name
}

output "pages_default_subdomain" {
  description = "Auto-assigned *.pages.dev host for the Pages project."
  value       = cloudflare_pages_project.web.subdomain
}

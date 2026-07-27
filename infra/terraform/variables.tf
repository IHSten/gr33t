variable "cloudflare_account_id" {
  description = "Cloudflare account ID that owns the D1/KV/R2/Pages resources."
  type        = string
}

variable "project_name" {
  description = "Base name for the Worker + Pages project (also the wrangler `name`)."
  type        = string
  default     = "gr33t"
}

variable "d1_database_name" {
  description = "D1 database name (must match `database_name` in worker/wrangler.toml)."
  type        = string
  default     = "gr33t"
}

variable "r2_bucket_name" {
  description = "R2 bucket for uploaded images (must match `bucket_name` in worker/wrangler.toml)."
  type        = string
  default     = "gr33t-images"
}

variable "kv_namespace_title" {
  description = "Title of the KV namespace backing sessions (the SESSIONS binding)."
  type        = string
  default     = "gr33t-sessions"
}

variable "card_cache_kv_namespace_title" {
  description = "Title of the KV namespace caching public card reads (the CARD_CACHE binding)."
  type        = string
  default     = "gr33t-card-cache"
}

variable "analytics_engine_dataset_name" {
  description = "Workers Analytics Engine dataset for product/event analytics (must match `dataset` in worker/wrangler.toml [[analytics_engine_datasets]], the EVENTS binding). Created implicitly on first write; not a provisioned resource."
  type        = string
  default     = "gr33t_events"
}

variable "r2_location" {
  description = "R2 bucket location hint (e.g. wnam, enam, weur, eeur, apac). Empty = automatic."
  type        = string
  default     = ""
}

variable "production_branch" {
  description = "Git branch treated as production for the Pages project."
  type        = string
  default     = "main"
}

variable "manage_domain" {
  description = "Attach `domain` as a custom domain on the Pages project."
  type        = bool
  default     = true
}

variable "manage_dns" {
  description = "Create the apex/www DNS records pointing at Pages (requires cloudflare_zone_id)."
  type        = bool
  default     = true
}

variable "domain" {
  description = "Apex domain the app is served from. Used for the Pages custom domain + DNS records and (via wrangler) the /api/* Worker route."
  type        = string
  default     = "gr33t.me"
}

variable "cloudflare_zone_id" {
  description = "Zone id for `domain` (from the Cloudflare dashboard). Required when manage_dns is true; in CI it comes from the CLOUDFLARE_ZONE_ID repo variable."
  type        = string
  default     = ""
}

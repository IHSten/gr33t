resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  title      = var.kv_namespace_title
}

resource "cloudflare_workers_kv_namespace" "card_cache" {
  account_id = var.cloudflare_account_id
  title      = var.card_cache_kv_namespace_title
}

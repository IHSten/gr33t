resource "cloudflare_r2_bucket" "images" {
  account_id = var.cloudflare_account_id
  name       = var.r2_bucket_name
  location   = var.r2_location != "" ? var.r2_location : null
}

resource "cloudflare_d1_database" "gr33t" {
  account_id = var.cloudflare_account_id
  name       = var.d1_database_name

  read_replication = {
    mode = "disabled"
  }
}

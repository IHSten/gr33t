resource "cloudflare_pages_project" "web" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch
}

resource "cloudflare_pages_domain" "apex" {
  count = var.manage_domain ? 1 : 0

  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.web.name
  name         = var.domain
}

resource "cloudflare_dns_record" "apex" {
  count = var.manage_dns ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "CNAME"
  content = "${cloudflare_pages_project.web.name}.pages.dev"
  proxied = true
  ttl     = 1
}

resource "cloudflare_dns_record" "www" {
  count = var.manage_dns ? 1 : 0

  zone_id = var.cloudflare_zone_id
  name    = "www.${var.domain}"
  type    = "CNAME"
  content = "${cloudflare_pages_project.web.name}.pages.dev"
  proxied = true
  ttl     = 1
}

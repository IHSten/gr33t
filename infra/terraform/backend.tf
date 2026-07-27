terraform {
  backend "s3" {
    bucket = "gr33t-tfstate"
    key    = "gr33t/terraform.tfstate"
    region = "auto"

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

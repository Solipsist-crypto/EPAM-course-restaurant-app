terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "terraform-state-773138022467"
    key          = "restaurant/terraform.tfstate"
    region       = "us-west-2"
    use_lockfile = true
    encrypt      = true
  }
}

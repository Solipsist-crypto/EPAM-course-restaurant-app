# Restaurant App

You can find Web API documentation [here](docs/ApiRoutes.md).

## Seed demo data in DynamoDB

`seed_data.py` adds three demo locations, five tables per location, fourteen dishes across appetizers, main courses, desserts, and drinks, and one waiter assignment per location when the configured Cognito user exists. It only writes records with stable `seed-` IDs, so rerunning it updates the same demo records instead of creating duplicates. It does not delete or modify records outside that seed namespace.

The script stores the `Drink` dish type as enum value `3`. Deploy the backend version that adds `DishType.Drink` before requesting menus that contain these drinks; an older API deployment will not recognize that enum value.

Waiters must be existing, enabled Cognito users. Configure `COGNITO_USER_POOL_ID` and a distinct email for each location using `WAITER_KYIV_EMAIL`, `WAITER_TBILISI_EMAIL`, and `WAITER_ODESA_EMAIL`. The script resolves each email to its Cognito `sub`, adds existing users to the Cognito `Waiter` group, and upserts their `Waiters` table records. It never creates Cognito accounts or invents placeholder user IDs. If a configured email is not registered, it seeds the other data and any resolvable waiters, prints which location is missing a waiter, and exits with a non-zero status; register a real account and rerun to finish.

The script uses the standard AWS credential chain (AWS CLI profile, environment credentials, or an SSO profile) and these optional environment variables:

| Variable | Default |
|---|---|
| `AWS_REGION` (or `AWS_DEFAULT_REGION`) | The region configured in the selected AWS profile |
| `LOCATIONS_TABLE` | `Locations` |
| `TABLES_TABLE` | `Tables` |
| `DISHES_TABLE` | `Dishes` |
| `WAITERS_TABLE` | `Waiters` |
| `COGNITO_USER_POOL_ID` | Required for waiter assignments |
| `WAITER_KYIV_EMAIL` | Required for apply |
| `WAITER_TBILISI_EMAIL` | Required for apply |
| `WAITER_ODESA_EMAIL` | Required for apply |

On Windows PowerShell, from this directory:

```powershell
python -m pip install boto3  # only if boto3 is not already installed
$env:AWS_PROFILE = "your-profile"
$env:AWS_REGION = "us-west-2"
$env:COGNITO_USER_POOL_ID = "<your-cognito-user-pool-id>"
$env:WAITER_KYIV_EMAIL = "<registered-kyiv-waiter-email>"
$env:WAITER_TBILISI_EMAIL = "<registered-tbilisi-waiter-email>"
$env:WAITER_ODESA_EMAIL = "<registered-odesa-waiter-email>"

# First check credentials, region, table names, and key schemas; this does not write data.
python .\seed_data.py

# Apply only after confirming the target account and tables.
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
python .\seed_data.py --apply --expected-account-id $ACCOUNT_ID
```

For custom DynamoDB table names, set `LOCATIONS_TABLE`, `TABLES_TABLE`, and/or `DISHES_TABLE` before running the script. The `--apply` flag is required for writes, as is `--expected-account-id`; the account ID is checked with STS before any seed records are written. The AWS identity needs permission to call `sts:GetCallerIdentity`, describe and write the four DynamoDB tables, and use Cognito `AdminGetUser`, `ListGroups`, `CreateGroup`, and `AdminAddUserToGroup`. Configure credentials with `aws configure` or `aws configure sso` before running.

The dish image URLs are checked against Unsplash and the script uses image URLs that returned HTTP 200 during verification. Since third-party image hosts can change availability, rerun the seed script after updating any image URL that later returns an error.
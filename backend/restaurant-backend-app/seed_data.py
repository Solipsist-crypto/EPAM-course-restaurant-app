#!/usr/bin/env python3
"""Idempotently seed demo locations, tables, and dishes into DynamoDB."""

from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError


LOCATIONS = [
    {
        "id": "seed-location-kyiv",
        "address": "Khreshchatyk 1 (Kyiv)",
        "description": "A bright, contemporary dining room in the heart of Kyiv.",
        "rating": Decimal("4.8"),
        "averageOccupancy": "72%",
        "imageUrl": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
    },
    {
        "id": "seed-location-tbilisi",
        "address": "Rustaveli Avenue 48 (Tbilisi)",
        "description": "Seasonal ingredients and relaxed dining on Rustaveli Avenue.",
        "rating": Decimal("4.7"),
        "averageOccupancy": "68%",
        "imageUrl": "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
    },
    {
        "id": "seed-location-odesa",
        "address": "Deribasivska 10 (Odesa)",
        "description": "A welcoming restaurant serving fresh, locally inspired dishes.",
        "rating": Decimal("4.6"),
        "averageOccupancy": "64%",
        "imageUrl": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
    },
]

TABLE_CAPACITIES = [2, 4, 6, 8, 4]

# The DishType integer values must match APIHandler.Constants.Dishes.DishType.
DISHES = [
    {
        "id": "seed-dish-kyiv-bruschetta",
        "locationId": "seed-location-kyiv",
        "name": "Tomato Basil Bruschetta",
        "description": "Toasted sourdough topped with ripe tomatoes, basil, and extra-virgin olive oil.",
        "dishType": 0,
        "price": Decimal("8.50"),
        "weight": "180 g",
        "calories": "280 kcal",
        "proteins": "7 g",
        "fats": "12 g",
        "carbohydrates": "36 g",
        "vitamins": "Vitamin C, Vitamin K",
        "imageUrl": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f",
        "allergens": ["gluten"],
    },
    {
        "id": "seed-dish-kyiv-soup",
        "locationId": "seed-location-kyiv",
        "name": "Roasted Pumpkin Soup",
        "description": "Silky roasted pumpkin soup with toasted seeds and a touch of cream.",
        "dishType": 0,
        "price": Decimal("7.25"),
        "weight": "300 g",
        "calories": "240 kcal",
        "proteins": "6 g",
        "fats": "11 g",
        "carbohydrates": "31 g",
        "vitamins": "Vitamin A, Vitamin E",
        "imageUrl": "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a",
        "allergens": ["dairy"],
    },
    {
        "id": "seed-dish-kyiv-salmon",
        "locationId": "seed-location-kyiv",
        "name": "Herb-Crusted Salmon",
        "description": "Oven-roasted salmon with herbs, lemon, and seasonal vegetables.",
        "dishType": 1,
        "price": Decimal("22.00"),
        "weight": "360 g",
        "calories": "520 kcal",
        "proteins": "38 g",
        "fats": "28 g",
        "carbohydrates": "24 g",
        "vitamins": "Vitamin D, Vitamin B12",
        "imageUrl": "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
        "allergens": ["seafood"],
    },
    {
        "id": "seed-dish-kyiv-cheesecake",
        "locationId": "seed-location-kyiv",
        "name": "Classic Berry Cheesecake",
        "description": "Creamy baked cheesecake finished with seasonal berries.",
        "dishType": 2,
        "price": Decimal("9.00"),
        "weight": "160 g",
        "calories": "410 kcal",
        "proteins": "8 g",
        "fats": "25 g",
        "carbohydrates": "39 g",
        "vitamins": "Vitamin C",
        "imageUrl": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad",
        "allergens": ["dairy", "gluten", "eggs", "berries"],
    },
    {
        "id": "seed-dish-tbilisi-pkhali",
        "locationId": "seed-location-tbilisi",
        "name": "Georgian Pkhali Trio",
        "description": "Three traditional vegetable and walnut spreads with warm bread.",
        "dishType": 0,
        "price": Decimal("10.50"),
        "weight": "240 g",
        "calories": "330 kcal",
        "proteins": "9 g",
        "fats": "22 g",
        "carbohydrates": "27 g",
        "vitamins": "Vitamin A, Vitamin E",
        "imageUrl": "https://images.unsplash.com/photo-1547592180-85f173990554",
        "allergens": ["nuts"],
    },
    {
        "id": "seed-dish-tbilisi-khinkali",
        "locationId": "seed-location-tbilisi",
        "name": "Beef Khinkali",
        "description": "Hand-folded dumplings filled with seasoned beef and fresh herbs.",
        "dishType": 1,
        "price": Decimal("14.00"),
        "weight": "320 g",
        "calories": "610 kcal",
        "proteins": "29 g",
        "fats": "24 g",
        "carbohydrates": "68 g",
        "vitamins": "Vitamin B12, Iron",
        "imageUrl": "https://images.unsplash.com/photo-1563245372-f21724e3856d",
        "allergens": ["gluten", "eggs"],
    },
    {
        "id": "seed-dish-tbilisi-kharcho",
        "locationId": "seed-location-tbilisi",
        "name": "Beef Kharcho",
        "description": "A hearty Georgian beef and rice soup with warming spices.",
        "dishType": 1,
        "price": Decimal("13.50"),
        "weight": "380 g",
        "calories": "470 kcal",
        "proteins": "27 g",
        "fats": "19 g",
        "carbohydrates": "48 g",
        "vitamins": "Vitamin B6, Iron",
        "imageUrl": "https://images.unsplash.com/photo-1547592180-85f173990554",
        "allergens": [],
    },
    {
        "id": "seed-dish-tbilisi-churchkhela",
        "locationId": "seed-location-tbilisi",
        "name": "Churchkhela with Walnuts",
        "description": "Traditional walnut and grape must sweet, served in bite-sized pieces.",
        "dishType": 2,
        "price": Decimal("6.50"),
        "weight": "100 g",
        "calories": "360 kcal",
        "proteins": "8 g",
        "fats": "17 g",
        "carbohydrates": "47 g",
        "vitamins": "Vitamin E",
        "imageUrl": "https://images.unsplash.com/photo-1519869325930-281384150729",
        "allergens": ["nuts"],
    },
    {
        "id": "seed-dish-odesa-salad",
        "locationId": "seed-location-odesa",
        "name": "Black Sea Vegetable Salad",
        "description": "Crisp local vegetables, herbs, and a light lemon dressing.",
        "dishType": 0,
        "price": Decimal("9.50"),
        "weight": "260 g",
        "calories": "210 kcal",
        "proteins": "5 g",
        "fats": "12 g",
        "carbohydrates": "23 g",
        "vitamins": "Vitamin C, Vitamin K",
        "imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
        "allergens": [],
    },
    {
        "id": "seed-dish-odesa-caesar-salad",
        "locationId": "seed-location-odesa",
        "name": "Caesar Salad",
        "description": "Crisp romaine lettuce with parmesan, croutons, and classic Caesar dressing.",
        "dishType": 0,
        "price": Decimal("12.00"),
        "weight": "280 g",
        "calories": "360 kcal",
        "proteins": "16 g",
        "fats": "22 g",
        "carbohydrates": "28 g",
        "vitamins": "Vitamin A, Vitamin K",
        "imageUrl": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9",
        "allergens": ["dairy", "gluten"],
    },
    {
        "id": "seed-dish-odesa-fish",
        "locationId": "seed-location-odesa",
        "name": "Grilled Sea Bass",
        "description": "Grilled sea bass with herbs, lemon, and a warm potato salad.",
        "dishType": 1,
        "price": Decimal("24.00"),
        "weight": "390 g",
        "calories": "540 kcal",
        "proteins": "42 g",
        "fats": "25 g",
        "carbohydrates": "34 g",
        "vitamins": "Vitamin D, Selenium",
        "imageUrl": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2",
        "allergens": ["seafood"],
    },
    {
        "id": "seed-dish-odesa-honey-cake",
        "locationId": "seed-location-odesa",
        "name": "Honey Layer Cake",
        "description": "Tender honey cake layered with lightly whipped cream.",
        "dishType": 2,
        "price": Decimal("8.00"),
        "weight": "150 g",
        "calories": "430 kcal",
        "proteins": "6 g",
        "fats": "20 g",
        "carbohydrates": "58 g",
        "vitamins": "Calcium",
        "imageUrl": "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
        "allergens": ["dairy", "gluten", "eggs"],
    },
]

DRINKS = [
    {
        "id": "seed-dish-kyiv-lemonade",
        "locationId": "seed-location-kyiv",
        "name": "Mint Lemonade",
        "description": "Freshly squeezed lemon, mint, and sparkling water.",
        "dishType": 3,
        "price": Decimal("5.00"),
        "weight": "350 ml",
        "calories": "95 kcal",
        "proteins": "0 g",
        "fats": "0 g",
        "carbohydrates": "24 g",
        "vitamins": "Vitamin C",
        "imageUrl": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
        "allergens": [],
    },
    {
        "id": "seed-dish-tbilisi-tarragon",
        "locationId": "seed-location-tbilisi",
        "name": "Tarragon Lemonade",
        "description": "A refreshing Georgian-style tarragon and citrus lemonade.",
        "dishType": 3,
        "price": Decimal("5.50"),
        "weight": "350 ml",
        "calories": "110 kcal",
        "proteins": "0 g",
        "fats": "0 g",
        "carbohydrates": "27 g",
        "vitamins": "Vitamin C",
        "imageUrl": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
        "allergens": [],
    },
    {
        "id": "seed-dish-odesa-compote",
        "locationId": "seed-location-odesa",
        "name": "Cherry Berry Compote",
        "description": "Chilled house-made compote with cherries and mixed berries.",
        "dishType": 3,
        "price": Decimal("4.50"),
        "weight": "300 ml",
        "calories": "125 kcal",
        "proteins": "1 g",
        "fats": "0 g",
        "carbohydrates": "31 g",
        "vitamins": "Vitamin C",
        "imageUrl": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
        "allergens": ["berries"],
    },
]

WAITER_EMAIL_ENV_VARS = {
    "seed-location-kyiv": "WAITER_KYIV_EMAIL",
    "seed-location-tbilisi": "WAITER_TBILISI_EMAIL",
    "seed-location-odesa": "WAITER_ODESA_EMAIL",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", help="AWS CLI profile to use (otherwise the standard credential chain is used).")
    parser.add_argument("--apply", action="store_true", help="Write the seed records (default is validation/dry-run only).")
    parser.add_argument(
        "--expected-account-id",
        help="Required with --apply; abort if AWS credentials resolve to a different account.",
    )
    return parser.parse_args()


def table_name(environment_name: str, default: str) -> str:
    value = os.getenv(environment_name, default).strip()
    if not value:
        raise ValueError(f"{environment_name} must not be empty.")
    return value


def validate_table(table: Any, expected_partition_key: str) -> None:
    table.load()
    schema = table.key_schema
    partition_keys = [key["AttributeName"] for key in schema if key["KeyType"] == "HASH"]
    if partition_keys != [expected_partition_key]:
        raise ValueError(
            f"Table {table.name!r} must use {expected_partition_key!r} as its partition key; "
            f"found {partition_keys!r}."
        )
    if table.table_status != "ACTIVE":
        raise ValueError(f"Table {table.name!r} is not ACTIVE (status: {table.table_status}).")


def build_records() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    dishes = [dict(dish, state=1) for dish in DISHES + DRINKS]
    dishes_by_location: dict[str, list[str]] = {location["id"]: [] for location in LOCATIONS}
    for dish in dishes:
        dishes_by_location[dish["locationId"]].append(dish["id"])

    locations = []
    for location in LOCATIONS:
        capacities = TABLE_CAPACITIES
        locations.append(
            {
                **location,
                "totalCapacity": sum(capacities),
                "specialtyDishIds": dishes_by_location[location["id"]],
            }
        )

    tables = []
    for location in LOCATIONS:
        for table_number, capacity in enumerate(TABLE_CAPACITIES, start=1):
            city = location["id"].removeprefix("seed-location-")
            tables.append(
                {
                    "id": f"seed-table-{city}-{table_number:02d}",
                    "locationId": location["id"],
                    "capacity": capacity,
                    "tableNumber": table_number,
                }
            )
    return locations, tables, dishes


def resolve_waiters(
    cognito: Any,
    pool_id: str,
    waiters_table: Any,
) -> tuple[list[dict[str, Any]], list[str]]:
    waiter_records = []
    missing_locations = []
    seen_emails: set[str] = set()

    for location_id, environment_name in WAITER_EMAIL_ENV_VARS.items():
        email = os.getenv(environment_name, "").strip().lower()
        if not email:
            raise ValueError(f"{environment_name} must be set to an existing Cognito user email.")
        if email in seen_emails:
            raise ValueError("Each seeded location must use a different Cognito waiter account.")
        seen_emails.add(email)

        try:
            user = cognito.admin_get_user(UserPoolId=pool_id, Username=email)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") == "UserNotFoundException":
                print(
                    f"WARNING: No Cognito account found for {environment_name}; "
                    f"no waiter record will be created for {location_id}.",
                    file=sys.stderr,
                )
                missing_locations.append(location_id)
                continue
            raise

        if not user.get("Enabled", True):
            raise ValueError(f"The Cognito user configured by {environment_name} is disabled.")

        attributes = {attribute["Name"]: attribute["Value"] for attribute in user.get("UserAttributes", [])}
        user_id = attributes.get("sub")
        if not user_id:
            raise ValueError(f"The Cognito user configured by {environment_name} has no sub attribute.")

        existing = waiters_table.get_item(Key={"userId": user_id}, ConsistentRead=True).get("Item")
        if existing and existing.get("locationId") != location_id:
            print(
                f"WARNING: The Cognito user configured by {environment_name} is already assigned to "
                f"{existing.get('locationId')!r}; skipping waiter assignment for {location_id}.",
                file=sys.stderr,
            )
            continue

        waiter_record = dict(existing or {})
        waiter_record.update(
            {
                "userId": user_id,
                "locationId": location_id,
                "createdAt": waiter_record.get("createdAt", datetime.now(timezone.utc).isoformat()),
                "reservations": waiter_record.get("reservations", []),
            }
        )
        waiter_records.append(waiter_record)

    return waiter_records, missing_locations


def ensure_waiter_group(cognito: Any, pool_id: str) -> None:
    next_token = None
    while True:
        request: dict[str, Any] = {"UserPoolId": pool_id, "Limit": 60}
        if next_token:
            request["NextToken"] = next_token
        response = cognito.list_groups(**request)
        if any(group.get("GroupName") == "Waiter" for group in response.get("Groups", [])):
            return
        next_token = response.get("NextToken")
        if not next_token:
            break

    cognito.create_group(UserPoolId=pool_id, GroupName="Waiter", Description="Waiter group")


def main() -> int:
    args = parse_args()
    if args.apply and not args.expected_account_id:
        print("--expected-account-id is required with --apply to guard against writing to the wrong AWS account.", file=sys.stderr)
        return 2
    if not args.apply and args.expected_account_id:
        print("--expected-account-id is only used with --apply.", file=sys.stderr)
        return 2

    region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION")
    session = boto3.Session(profile_name=args.profile, region_name=region)
    if not session.region_name:
        print("Set AWS_REGION/AWS_DEFAULT_REGION or configure a default region with `aws configure`.", file=sys.stderr)
        return 2

    try:
        if args.apply:
            identity = session.client("sts").get_caller_identity()
            if identity["Account"] != args.expected_account_id:
                print(
                    f"AWS account mismatch: expected {args.expected_account_id}, "
                    f"credentials resolve to {identity['Account']}. No records were written.",
                    file=sys.stderr,
                )
                return 2
            print(f"Writing demo records to AWS account {identity['Account']} in {session.region_name}.")
        else:
            print(f"Dry run: validating DynamoDB tables in {session.region_name}; no records will be written.")

        dynamodb = session.resource("dynamodb")
        locations_table = dynamodb.Table(table_name("LOCATIONS_TABLE", "Locations"))
        tables_table = dynamodb.Table(table_name("TABLES_TABLE", "Tables"))
        dishes_table = dynamodb.Table(table_name("DISHES_TABLE", "Dishes"))
        waiters_table = dynamodb.Table(table_name("WAITERS_TABLE", "Waiters"))
        validate_table(locations_table, "id")
        validate_table(tables_table, "id")
        validate_table(dishes_table, "id")
        validate_table(waiters_table, "userId")

        locations, tables, dishes = build_records()
        records = [
            (locations_table, locations),
            (tables_table, tables),
            (dishes_table, dishes),
        ]
        if not args.apply:
            print(
                f"Validated tables: {locations_table.name}, {tables_table.name}, "
                f"{dishes_table.name}, {waiters_table.name}"
            )
            print(f"Would upsert {len(locations)} locations, {len(tables)} tables, and {len(dishes)} dishes.")
            print("Run again with --apply --expected-account-id <12-digit-account-id> to write.")
            return 0

        pool_id = os.getenv("COGNITO_USER_POOL_ID", "").strip()
        if not pool_id:
            raise ValueError("COGNITO_USER_POOL_ID must be set to resolve and assign the waiter Cognito users.")
        cognito = session.client("cognito-idp")
        waiter_records, missing_waiter_locations = resolve_waiters(cognito, pool_id, waiters_table)

        if waiter_records:
            ensure_waiter_group(cognito, pool_id)
            for record in waiter_records:
                cognito.admin_add_user_to_group(
                    UserPoolId=pool_id,
                    Username=next(
                        os.environ[environment_name].strip().lower()
                        for location_id, environment_name in WAITER_EMAIL_ENV_VARS.items()
                        if location_id == record["locationId"]
                    ),
                    GroupName="Waiter",
                )

        for table, items in records:
            for item in items:
                table.put_item(Item=item)
            print(f"Upserted {len(items)} records into {table.name}.")

        for record in waiter_records:
            waiters_table.put_item(Item=record)
        if waiter_records:
            print(f"Upserted {len(waiter_records)} waiter assignments into {waiters_table.name}.")

        if missing_waiter_locations:
            print(
                "Seed data was written, but waiter setup is incomplete. Register real Cognito accounts for "
                + ", ".join(missing_waiter_locations)
                + " and rerun the script."
            )
            return 1

        print(
            "Seed completed. Re-running updates the same seed IDs and preserves each waiter's "
            "creation timestamp and reservations."
        )
        return 0
    except (BotoCoreError, ClientError, ValueError) as error:
        print(f"Seed failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

# How to generate Swagger Documentation

The Swagger UI spec is maintained at `swagger_src/swagger-ui/swagger-endpoints.json`.
Keep it as valid JSON: Syndicate packages it as `swagger-ui_spec.json` and reads
it as JSON when resolving the API Gateway URL during deployment.

The root-level `x-syndicate-server` extension identifies the API Gateway
resource and stage. Syndicate looks up the current API ID and region from the
deployment, then replaces `servers[0].url` before uploading the spec. Keep
`resource_name` in sync with `api_gateway_name` in
`.syndicate-config-restaurant-backend-app/syndicate_aliases.yml`, and update
`parameter_name` if the API stage changes.

To regenerate the Swagger UI resource from an exported API Gateway schema:

1. Deploy the application using AWS Syndicate and export the API schema:
   ```bash
   syndicate export -rt api_gateway
   ```
2. Save the exported schema as valid JSON at
   `swagger_src/swagger-ui/swagger-endpoints.json`.
3. Preserve the `x-syndicate-server` extension from the maintained spec. It
   must include the API Gateway resource name, resource type, stage parameter
   type, and stage name; otherwise Syndicate cannot resolve the active URL.
4. Ensure `swagger_src/swagger-ui/swagger_ui_config.json` points to
   `swagger_src/swagger-ui/swagger-endpoints.json` and uses
   `${swagger_ui_hoster_bucket_name}` as its target bucket.
5. Run `syndicate build` and `syndicate update`.
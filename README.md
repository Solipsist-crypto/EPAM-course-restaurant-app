# Restaurant Reservation System

### Full-stack cloud platform for table reservations, group dining, and order consolidation

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Terraform](https://img.shields.io/badge/Terraform-Infrastructure-844FBA?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Python](https://img.shields.io/badge/Python-Backend-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Angular](https://img.shields.io/badge/Angular-Frontend-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-4053D6?logo=amazondynamodb&logoColor=white)](https://aws.amazon.com/dynamodb/)
[![Status](https://img.shields.io/badge/Status-Completed-brightgreen)](#)

---

## 🌐 Live Demo

The deployed frontend is available on AWS CloudFront:

**[https://d156bsfqw0ujop.cloudfront.net](https://d156bsfqw0ujop.cloudfront.net)**

---

## 📌 About

**Restaurant Reservation System** is a production-oriented, serverless reservation platform built to simplify restaurant operations and deliver a seamless dining experience for guests and owners.

The platform enables customers to reserve tables, organize group dining sessions, invite participants, contribute dishes to a shared order, and submit a consolidated pre-order to the restaurant. Owners can authenticate securely, confirm reservations, manage participating guests, and coordinate orders from a centralized workflow.

The project demonstrates the complete lifecycle of a modern cloud application: responsive frontend development, REST API design, serverless backend implementation, secure identity management, infrastructure provisioning, and scalable AWS deployment.

---

## ✨ Features

### 🧑‍🤝‍🧑 Level 1 — Group Guest Sessions

- Create a reservation and launch a collaborative group session.
- Invite guests and collect individual participant selections.
- Keep the group dining experience synchronized and easy to manage.
- Store guest sessions and submitted choices in DynamoDB.

### 👨‍🍳 Level 2 — Owner Confirmation and Order Consolidation

- Authenticate restaurant owners through Amazon Cognito.
- Confirm or manage reservations through protected API operations.
- Consolidate individual dishes into a complete group pre-order.
- Submit the final order as a structured unit for restaurant processing.

### 🗑️ Level 3 — Guest Session Management

- Remove a guest from an active group session.
- Enforce owner-level authorization for sensitive operations.
- Validate guest membership and preserve session consistency.
- Support the complete reservation-to-order lifecycle with clear application states.

Additional capabilities include:

- 🔐 JWT-based authorization with Cognito
- 🍽️ Restaurant, table, menu, and reservation browsing
- 🛒 Guest cart and combined group order flows
- 🌐 Fully responsive Angular interface
- ☁️ Serverless AWS backend and managed infrastructure

---

## 🏗️ Architecture

```text
  User
   │
   ▼
  CloudFront
   │
   ▼
  Amazon S3 ────── Static Angular Application
   │
   ▼
  Amazon API Gateway
   │
   ▼
  AWS Lambda
   │
   ├──────────► DynamoDB
   │
   └──────────► Amazon Cognito (JWT authentication)
```

- **Amazon CloudFront** provides global delivery and HTTPS access to the application.
- **Amazon S3** hosts the compiled Angular frontend.
- **API Gateway** exposes the secured REST API and routes requests to backend handlers.
- **AWS Lambda** implements serverless business logic, including reservations, group sessions, and order processing.
- **DynamoDB** provides low-latency, scalable storage for application data.
- **Amazon Cognito** authenticates users and issues JWT tokens. Owner-only operations validate the authenticated identity before granting access.

---

## 🧰 Tech Stack

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Angular, TypeScript | Responsive user interface and client-side application logic |
| **Backend** | Python, AWS Lambda | Serverless API and business logic |
| **API** | Amazon API Gateway | REST endpoints, routing, and request exposure |
| **Database** | Amazon DynamoDB | Scalable NoSQL data storage |
| **Authentication** | Amazon Cognito | User registration, sign-in, JWT issuance |
| **Frontend Hosting** | Amazon S3, CloudFront | Static hosting and global content delivery |
| **Infrastructure** | Terraform | Declarative AWS resource provisioning |
| **Backend Deployment** | AWS Syndicate | Backend packaging and AWS deployment |

---

## 🚀 Deployment

The solution uses three coordinated deployment stages:

### 1. Provision shared AWS infrastructure

Terraform creates the AWS foundation, including the frontend S3 bucket and CloudFront distribution.

```powershell
cd infra\terraform
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
terraform apply
```

### 2. Deploy the backend

AWS Syndicate packages and deploys the serverless application, including Lambda functions and API resources.

```powershell
cd backend\restaurant-backend-app
syndicate build
syndicate deploy --deploy_name dev
```

### 3. Build and publish the frontend

Build the Angular application and synchronize the production artifacts with the S3 hosting bucket.

```powershell
cd frontend\restaurant-frontend-app
npm ci
npm run build
aws s3 sync dist\restaurant-frontend-app s3://<frontend-bucket-name> --delete
```

After deployment, CloudFront delivers the latest frontend version to users.

---

## 🎓 EPAM IT Marathon

This project was completed as the capstone project for **EPAM IT Marathon 6.0**, a 120-hour course in modern software engineering and cloud development.

The program resulted in a **maximum-level certificate**, recognizing the successful implementation of the full-stack application, AWS infrastructure, deployment automation, and all three feature levels.

---

## 👤 Author

**[Solipsist-crypto](https://github.com/Solipsist-crypto)**

Full-stack and cloud solution developed for the EPAM IT Marathon 6.0 capstone project.

--
-- PostgreSQL database dump
--

\restrict 4IRFcqMi4ZAueGUV9DlJ6zDylrVsn7V13jIP9tOOEoIhZe2TZT7acha3LXFezAM

-- Dumped from database version 16.4 (Debian 16.4-1.pgdg110+2)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: deliver
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO deliver;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: deliver
--

COMMENT ON SCHEMA public IS '';


--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: deliver
--

CREATE SCHEMA tiger;


ALTER SCHEMA tiger OWNER TO deliver;

--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: deliver
--

CREATE SCHEMA tiger_data;


ALTER SCHEMA tiger_data OWNER TO deliver;

--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: deliver
--

CREATE SCHEMA topology;


ALTER SCHEMA topology OWNER TO deliver;

--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: deliver
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."AccountType" AS ENUM (
    'STAFF',
    'COURIER',
    'CUSTOMER'
);


ALTER TYPE public."AccountType" OWNER TO deliver;

--
-- Name: CourierStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."CourierStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);


ALTER TYPE public."CourierStatus" OWNER TO deliver;

--
-- Name: EarningStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."EarningStatus" AS ENUM (
    'PENDING',
    'RELEASED',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public."EarningStatus" OWNER TO deliver;

--
-- Name: EarningType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."EarningType" AS ENUM (
    'DELIVERY',
    'BONUS',
    'PENALTY',
    'TIP',
    'ADJUSTMENT'
);


ALTER TYPE public."EarningType" OWNER TO deliver;

--
-- Name: ItemType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."ItemType" AS ENUM (
    'PARCEL',
    'DOCUMENT',
    'BOX',
    'ENVELOPE',
    'FOOD',
    'ELECTRONICS',
    'CLOTHING',
    'MEDICINE',
    'FRAGILE_ITEM',
    'OTHER'
);


ALTER TYPE public."ItemType" OWNER TO deliver;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."NotificationType" AS ENUM (
    'ORDER_CREATED',
    'ORDER_STATUS_CHANGED',
    'ORDER_ASSIGNED',
    'ORDER_PICKED_UP',
    'ORDER_DELIVERED',
    'ORDER_FAILED',
    'ORDER_CANCELLED',
    'COURIER_APPROVED',
    'COURIER_REJECTED',
    'PAYOUT_PAID',
    'RECEIVER_LINK',
    'WELCOME',
    'SYSTEM',
    'MANUAL'
);


ALTER TYPE public."NotificationType" OWNER TO deliver;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'DRAFT',
    'AWAITING_RECEIVER_LOCATION',
    'PENDING_PAYMENT',
    'PAID',
    'ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED',
    'CANCELLED',
    'RETURNED'
);


ALTER TYPE public."OrderStatus" OWNER TO deliver;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'TELEBIRR',
    'CHAPA',
    'CBE_BIRR',
    'BANK_TRANSFER',
    'PREPAID'
);


ALTER TYPE public."PaymentMethod" OWNER TO deliver;

--
-- Name: PaymentParty; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."PaymentParty" AS ENUM (
    'SENDER',
    'RECEIVER',
    'SPLIT'
);


ALTER TYPE public."PaymentParty" OWNER TO deliver;

--
-- Name: PaymentProviderType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."PaymentProviderType" AS ENUM (
    'MOBILE_MONEY',
    'CARD',
    'BANK',
    'CASH',
    'WALLET',
    'CRYPTO'
);


ALTER TYPE public."PaymentProviderType" OWNER TO deliver;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PAID',
    'REFUNDED',
    'FAILED'
);


ALTER TYPE public."PaymentStatus" OWNER TO deliver;

--
-- Name: PayoutStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."PayoutStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PAID',
    'FAILED'
);


ALTER TYPE public."PayoutStatus" OWNER TO deliver;

--
-- Name: ReceiverLinkStatus; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."ReceiverLinkStatus" AS ENUM (
    'ACTIVE',
    'USED',
    'EXPIRED',
    'REVOKED'
);


ALTER TYPE public."ReceiverLinkStatus" OWNER TO deliver;

--
-- Name: StaffRole; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."StaffRole" AS ENUM (
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'BRANCH_MANAGER'
);


ALTER TYPE public."StaffRole" OWNER TO deliver;

--
-- Name: VehicleType; Type: TYPE; Schema: public; Owner: deliver
--

CREATE TYPE public."VehicleType" AS ENUM (
    'MOTORCYCLE',
    'BICYCLE',
    'CAR',
    'VAN',
    'TRUCK'
);


ALTER TYPE public."VehicleType" OWNER TO deliver;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO deliver;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.branches (
    id text NOT NULL,
    "regionId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    city text,
    woreda text,
    address text,
    phone text,
    lat double precision,
    lng double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.branches OWNER TO deliver;

--
-- Name: courier_earnings; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.courier_earnings (
    id text NOT NULL,
    "courierId" text NOT NULL,
    "orderId" text,
    amount double precision NOT NULL,
    currency text DEFAULT 'ETB'::text NOT NULL,
    type public."EarningType" DEFAULT 'DELIVERY'::public."EarningType" NOT NULL,
    status public."EarningStatus" DEFAULT 'PENDING'::public."EarningStatus" NOT NULL,
    description text,
    "releasedAt" timestamp(3) without time zone,
    "payoutId" text,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.courier_earnings OWNER TO deliver;

--
-- Name: couriers; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.couriers (
    id text NOT NULL,
    phone text NOT NULL,
    name text NOT NULL,
    email text,
    "passwordHash" text,
    "passwordChangedAt" timestamp(3) without time zone,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "regionId" text NOT NULL,
    "branchId" text NOT NULL,
    "vehicleType" public."VehicleType" NOT NULL,
    "vehiclePlate" text,
    "vehicleModel" text,
    "vehicleColor" text,
    "vehicleYear" integer,
    "licenseNumber" text,
    "maxWeightKg" double precision,
    "maxVolumeL" double precision,
    "handlesFragile" boolean DEFAULT false NOT NULL,
    "handlesRefrigerated" boolean DEFAULT false NOT NULL,
    "nationalIdNumber" text,
    "nationalIdImageUrl" text,
    "licenseImageUrl" text,
    "vehicleImageUrl" text,
    "selfieUrl" text,
    status public."CourierStatus" DEFAULT 'PENDING'::public."CourierStatus" NOT NULL,
    "rejectionReason" text,
    "approvedById" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedById" text,
    "rejectedAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "suspendedAt" timestamp(3) without time zone,
    "suspendedById" text,
    rating double precision DEFAULT 5.0 NOT NULL,
    "totalDeliveries" integer DEFAULT 0 NOT NULL,
    "totalFailed" integer DEFAULT 0 NOT NULL,
    "isOnline" boolean DEFAULT false NOT NULL,
    "currentLat" double precision,
    "currentLng" double precision,
    "lastSeenAt" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.couriers OWNER TO deliver;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.customers (
    id text NOT NULL,
    phone text NOT NULL,
    name text,
    email text,
    "googleId" text,
    "telegramId" text,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "defaultAddress" text,
    "defaultLat" double precision,
    "defaultLng" double precision,
    "registeredById" text,
    "registeredByType" public."AccountType"
);


ALTER TABLE public.customers OWNER TO deliver;

--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.device_tokens (
    id text NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "customerId" text,
    "courierId" text,
    "staffId" text,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.device_tokens OWNER TO deliver;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    type public."NotificationType" NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "customerId" text,
    "courierId" text,
    "staffId" text,
    title text NOT NULL,
    body text NOT NULL,
    "imageUrl" text,
    data jsonb,
    "orderId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "pushSent" boolean DEFAULT false NOT NULL,
    "pushSentAt" timestamp(3) without time zone,
    "pushError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


ALTER TABLE public.notifications OWNER TO deliver;

--
-- Name: order_events; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.order_events (
    id text NOT NULL,
    "orderId" text NOT NULL,
    status public."OrderStatus" NOT NULL,
    note text,
    location text,
    lat double precision,
    lng double precision,
    "actorType" public."AccountType",
    "actorId" text,
    "actorName" text,
    "isPublic" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.order_events OWNER TO deliver;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.order_items (
    id text NOT NULL,
    "orderId" text NOT NULL,
    type public."ItemType" DEFAULT 'PARCEL'::public."ItemType" NOT NULL,
    description text,
    quantity integer DEFAULT 1 NOT NULL,
    "weightKg" double precision DEFAULT 0 NOT NULL,
    "lengthCm" double precision,
    "widthCm" double precision,
    "heightCm" double precision,
    "volumeL" double precision,
    "declaredValue" double precision,
    "isFragile" boolean DEFAULT false NOT NULL,
    "isRefrigerated" boolean DEFAULT false NOT NULL,
    "photoUrl" text
);


ALTER TABLE public.order_items OWNER TO deliver;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "trackingNumber" text NOT NULL,
    "senderId" text,
    "senderName" text NOT NULL,
    "senderPhone" text NOT NULL,
    "senderAddress" text,
    "senderLat" double precision,
    "senderLng" double precision,
    "senderBranchId" text,
    "receiverId" text,
    "receiverName" text,
    "receiverPhone" text NOT NULL,
    "receiverAddress" text,
    "receiverLat" double precision,
    "receiverLng" double precision,
    "receiverLocationSource" text,
    "originBranchId" text,
    "destBranchId" text,
    "courierId" text,
    "distanceKm" double precision,
    "totalWeightKg" double precision DEFAULT 0 NOT NULL,
    "totalVolumeL" double precision DEFAULT 0 NOT NULL,
    "isFragile" boolean DEFAULT false NOT NULL,
    "isRefrigerated" boolean DEFAULT false NOT NULL,
    "packageDescription" text,
    "deliveryFee" double precision DEFAULT 0 NOT NULL,
    "codAmount" double precision DEFAULT 0 NOT NULL,
    "courierEarning" double precision DEFAULT 0 NOT NULL,
    "platformFee" double precision DEFAULT 0 NOT NULL,
    "pricingBreakdown" jsonb,
    "paymentParty" public."PaymentParty" DEFAULT 'SENDER'::public."PaymentParty" NOT NULL,
    "paymentMethod" public."PaymentMethod",
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    status public."OrderStatus" DEFAULT 'DRAFT'::public."OrderStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "assignedAt" timestamp(3) without time zone,
    "pickedUpAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "deliveryPhotoUrl" text,
    "deliverySignatureUrl" text,
    "deliveryOtp" text,
    "receiverConfirmed" boolean DEFAULT false NOT NULL,
    "failureReason" text,
    "trackingUrl" text,
    "trackingToken" text,
    "lastCourierLat" double precision,
    "lastCourierLng" double precision,
    "lastTrackedAt" timestamp(3) without time zone,
    "estimatedArrival" timestamp(3) without time zone,
    "createdById" text,
    "qrCodeImageUrl" text,
    "qrCodePayload" text,
    "qrCodeSignature" text,
    "trackingTokenExpiresAt" timestamp(3) without time zone,
    "trackingTokenRevokedAt" timestamp(3) without time zone,
    "trackingTokenSetAt" timestamp(3) without time zone
);


ALTER TABLE public.orders OWNER TO deliver;

--
-- Name: otp_codes; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.otp_codes (
    id text NOT NULL,
    phone text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "codeHash" text NOT NULL,
    purpose text DEFAULT 'login'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "staffId" text,
    "courierId" text,
    "customerId" text
);


ALTER TABLE public.otp_codes OWNER TO deliver;

--
-- Name: payment_providers; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.payment_providers (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    type public."PaymentProviderType" NOT NULL,
    "logoUrl" text,
    color text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "isTestMode" boolean DEFAULT true NOT NULL,
    "feePercent" double precision DEFAULT 0 NOT NULL,
    "feeFixed" double precision DEFAULT 0 NOT NULL,
    "minAmount" double precision,
    "maxAmount" double precision,
    "apiKey" text,
    "apiSecret" text,
    "merchantId" text,
    "webhookUrl" text,
    "configJson" jsonb,
    "createdById" text,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payment_providers OWNER TO deliver;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "orderId" text NOT NULL,
    amount double precision NOT NULL,
    currency text DEFAULT 'ETB'::text NOT NULL,
    method public."PaymentMethod" NOT NULL,
    party public."PaymentParty" NOT NULL,
    "gatewayRef" text,
    "gatewayPayload" jsonb,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "refundedAt" timestamp(3) without time zone,
    "refundAmount" double precision,
    "refundReason" text,
    "createdById" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payments OWNER TO deliver;

--
-- Name: payouts; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.payouts (
    id text NOT NULL,
    "courierId" text NOT NULL,
    "totalAmount" double precision NOT NULL,
    currency text DEFAULT 'ETB'::text NOT NULL,
    "earningCount" integer DEFAULT 0 NOT NULL,
    "periodStart" timestamp(3) without time zone NOT NULL,
    "periodEnd" timestamp(3) without time zone NOT NULL,
    method public."PaymentMethod",
    reference text,
    status public."PayoutStatus" DEFAULT 'PENDING'::public."PayoutStatus" NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "failureReason" text,
    "processedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.payouts OWNER TO deliver;

--
-- Name: receiver_links; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.receiver_links (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "shortCode" text NOT NULL,
    "tokenHash" text NOT NULL,
    "receiverPhone" text NOT NULL,
    purpose text DEFAULT 'receiver_onboarding'::text NOT NULL,
    status public."ReceiverLinkStatus" DEFAULT 'ACTIVE'::public."ReceiverLinkStatus" NOT NULL,
    "sentViaSms" boolean DEFAULT false NOT NULL,
    "sentViaTelegram" boolean DEFAULT false NOT NULL,
    "sentViaWhatsapp" boolean DEFAULT false NOT NULL,
    "openedAt" timestamp(3) without time zone,
    "openedIp" text,
    "filledAt" timestamp(3) without time zone,
    "filledIp" text,
    "otpVerified" boolean DEFAULT false NOT NULL,
    "otpVerifiedAt" timestamp(3) without time zone,
    "capturedLat" double precision,
    "capturedLng" double precision,
    "capturedAccuracy" double precision,
    "capturedSource" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.receiver_links OWNER TO deliver;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "accountType" public."AccountType" NOT NULL,
    "tokenHash" text NOT NULL,
    family text NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "staffId" text,
    "courierId" text,
    "customerId" text
);


ALTER TABLE public.refresh_tokens OWNER TO deliver;

--
-- Name: regions; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.regions (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.regions OWNER TO deliver;

--
-- Name: staff; Type: TABLE; Schema: public; Owner: deliver
--

CREATE TABLE public.staff (
    id text NOT NULL,
    phone text NOT NULL,
    name text NOT NULL,
    email text,
    "passwordHash" text,
    "passwordChangedAt" timestamp(3) without time zone,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    role public."StaffRole" NOT NULL,
    "regionId" text,
    "branchId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "suspendedAt" timestamp(3) without time zone,
    "suspendedById" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.staff OWNER TO deliver;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7410846c-d7a9-4caa-8990-15a78704fa5c	1aa8f00a62bd33d3a60d6c1cece528a8817efec8795e5d793e117dcef4206fa9	2026-09-28 13:50:16.315469+00	20260922081930_init_v5	\N	\N	2026-09-28 13:50:16.236211+00	1
0b13e665-92e0-4cdf-907b-4b8d0fde9367	1326812c73038cb6b569e156bae326d2808ca6205aa58ee5a5bd545919f0a322	2026-09-28 13:50:16.324977+00	20260922094958_add_payment_providers	\N	\N	2026-09-28 13:50:16.316745+00	1
be62a2ba-1e69-4094-909e-994f17331fa4	601c3e50e0939d5cdd580672aaad994b1007d5867e244f84466ddb11dcc288ee	2026-09-28 13:50:16.395368+00	20260922102111_add_orders_and_tracking	\N	\N	2026-09-28 13:50:16.325755+00	1
93d29935-351d-47ca-9733-32a1de72d72a	7e6af2e02a35e3a1a82f6e155d875718d0d2e132585651e18f5ae04510a10727	2026-09-28 13:50:16.398233+00	20260922145826_add_qr_and_tracking_fields	\N	\N	2026-09-28 13:50:16.395952+00	1
5e3ff55d-8bda-4b4e-b0d7-779e19f0a209	8d0aa04f7be6a58b05a5745e3022de443039fbfea5e4a58984323a3c8c8cfa1f	2026-09-28 13:50:16.407773+00	20260923143944_add_device_tokens	\N	\N	2026-09-28 13:50:16.398828+00	1
c6505ab3-582d-4c9c-9b61-e365704772bc	7fc0ae0f47a2394e820c4fb1ca87a4925ed8149a33dcdf872930aa7c970a3c5e	2026-09-28 13:50:16.418754+00	20260925194253_add_notifications	\N	\N	2026-09-28 13:50:16.408618+00	1
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.branches (id, "regionId", name, code, city, woreda, address, phone, lat, lng, "isActive", "createdById", "createdAt", "updatedAt") FROM stdin;
cmulbgt9x000911x1vtbbfvmu	cmulbfveg000511x1qnpqz8cu	Adama	OR-AD	adma	Adama 02	adma cit	0988107722	23.9	71.9	t	\N	2026-09-28 14:02:10.101	2026-09-28 14:02:10.101
cmulbpyvc000t11x18enkzxj5	cmulbg1in000711x1ora6uiw7	BAhir dar city	BDR-AA	BAHIRDAR	09	BAHIR DAR	0988107666	23.9	78	t	\N	2026-09-28 14:09:17.257	2026-09-28 14:09:17.257
\.


--
-- Data for Name: courier_earnings; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.courier_earnings (id, "courierId", "orderId", amount, currency, type, status, description, "releasedAt", "payoutId", "paidAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: couriers; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.couriers (id, phone, name, email, "passwordHash", "passwordChangedAt", "mustChangePassword", "regionId", "branchId", "vehicleType", "vehiclePlate", "vehicleModel", "vehicleColor", "vehicleYear", "licenseNumber", "maxWeightKg", "maxVolumeL", "handlesFragile", "handlesRefrigerated", "nationalIdNumber", "nationalIdImageUrl", "licenseImageUrl", "vehicleImageUrl", "selfieUrl", status, "rejectionReason", "approvedById", "approvedAt", "rejectedById", "rejectedAt", "isActive", "phoneVerified", "suspendedAt", "suspendedById", rating, "totalDeliveries", "totalFailed", "isOnline", "currentLat", "currentLng", "lastSeenAt", "createdById", "createdAt", "updatedAt") FROM stdin;
cmulbjk4f000h11x1aefdselg	251988888888	Yades dr	yades.dev@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$o9s6JtX3ZZuEr+WiAsx4RA$VTg4Ob6XGAEHKYhI7jW7GusFUTbokPBdWhCU3hR1KTo	2026-09-28 14:04:18.199	f	cmulbg1in000711x1ora6uiw7	cmulbpyvc000t11x18enkzxj5	BICYCLE	AA-123456	MOTER	yello	2020	DL03473	\N	\N	f	f	988107722	\N	\N	\N	\N	APPROVED	\N	cmulbeozm0000wwkmn85nrqm6	2026-09-29 10:59:09.65	\N	\N	t	t	\N	\N	5	0	0	t	9.0192	38.7525	2026-09-29 17:45:02.086	cmulbhizl000b11x184arck41	2026-09-28 14:04:18.207	2026-09-29 17:45:02.087
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.customers (id, phone, name, email, "googleId", "telegramId", "phoneVerified", "emailVerified", "isActive", "createdAt", "updatedAt", "defaultAddress", "defaultLat", "defaultLng", "registeredById", "registeredByType") FROM stdin;
cmumkekcn0005rpfmsml45ocn	251988107755	dev dess	dev@gmail.com	\N	\N	t	f	t	2026-09-29 11:00:07.943	2026-09-29 15:12:32.654	hawasa	78	67	cmulbeozm0000wwkmn85nrqm6	STAFF
cmumkdu8b0003rpfmjtl2wd2i	251988107722	Dess Dev	yades.dev@gmail.com	\N	\N	t	f	t	2026-09-29 10:59:34.091	2026-10-02 07:14:41.807	hawasa	4	6	cmulbeozm0000wwkmn85nrqm6	STAFF
\.


--
-- Data for Name: device_tokens; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.device_tokens (id, token, platform, "accountType", "isActive", "customerId", "courierId", "staffId", "lastUsedAt", "createdAt", "updatedAt") FROM stdin;
cmuvecezs001ezv0l18q9z9tz	dVUtTPUcR9mTnE_g9PeMRZ:APA91bH2ewYDWf1QQ6DJI4TfOm-6u5pVEKnr0zjVNW3ePSPHv49GFA6CaPPeNw9j6pDbGBFgdB5txIVwWg2AdQzEiGX2jTTIXX-mBNiD4QiHGNIhCIoB-yU	android	CUSTOMER	t	cmumkdu8b0003rpfmjtl2wd2i	\N	\N	2026-10-12 11:15:04.853	2026-10-05 15:20:25.576	2026-10-12 11:15:04.854
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.notifications (id, type, "accountType", "customerId", "courierId", "staffId", title, body, "imageUrl", data, "orderId", "isRead", "readAt", "pushSent", "pushSentAt", "pushError", "createdAt", "expiresAt") FROM stdin;
\.


--
-- Data for Name: order_events; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.order_events (id, "orderId", status, note, location, lat, lng, "actorType", "actorId", "actorName", "isPublic", "createdAt") FROM stdin;
cmuvdqknl000izv0l351ezejq	cmuvdqknb000fzv0lllbgzz3e	PENDING_PAYMENT	Order created	\N	\N	\N	CUSTOMER	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	f	2026-10-05 15:03:26.482
cmuve0m0o000yzv0lmktijd77	cmuvdqknb000fzv0lllbgzz3e	PAID	Payment received via Chapa (DEL-ETH-2026-EH10SU-c7d5ad72)	\N	\N	\N	\N	\N	\N	t	2026-10-05 15:11:14.809
cmv55on4y000ao8ibaxi8y43p	cmv55on4t0007o8ib614kv7a4	AWAITING_RECEIVER_LOCATION	Waiting for receiver to share location	\N	\N	\N	CUSTOMER	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	f	2026-10-12 11:15:41.219
cmv55udfu000go8ibjyvc6u2v	cmv55on4t0007o8ib614kv7a4	PENDING_PAYMENT	Receiver shared location via link	\N	\N	\N	\N	\N	System	t	2026-10-12 11:20:08.586
cmv56e91i000ro8ibayesvews	cmv55on4t0007o8ib614kv7a4	ASSIGNED	Assigned to courier Yades dr	\N	\N	\N	STAFF	cmulbeozm0000wwkmn85nrqm6	Super Admin	t	2026-10-12 11:35:36.006
cmv56sy96000zo8ibg3bryvw6	cmv56sy8p000wo8ibc2hkjnwc	AWAITING_RECEIVER_LOCATION	Waiting for receiver to share location	\N	\N	\N	CUSTOMER	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	f	2026-10-12 11:47:01.867
cmv574o6p0017o8ib2j9jn21m	cmv56sy8p000wo8ibc2hkjnwc	PENDING_PAYMENT	Receiver shared location via link	\N	\N	\N	\N	\N	System	t	2026-10-12 11:56:08.689
cmv577fm7001co8ibfasq32eh	cmv56sy8p000wo8ibc2hkjnwc	ASSIGNED	Assigned to courier Yades dr	\N	\N	\N	STAFF	cmulbeozm0000wwkmn85nrqm6	Super Admin	t	2026-10-12 11:58:17.552
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.order_items (id, "orderId", type, description, quantity, "weightKg", "lengthCm", "widthCm", "heightCm", "volumeL", "declaredValue", "isFragile", "isRefrigerated", "photoUrl") FROM stdin;
cmuvdqknb000gzv0lj9yn1qej	cmuvdqknb000fzv0lllbgzz3e	BOX	coffee	1	1	\N	\N	\N	\N	\N	f	f	\N
cmv55on4t0008o8ibuby56r6f	cmv55on4t0007o8ib614kv7a4	PARCEL	book	1	4	\N	\N	\N	\N	\N	f	f	\N
cmv56sy8p000xo8ibpoa335ip	cmv56sy8p000wo8ibc2hkjnwc	PARCEL	suger	1	5	\N	\N	\N	\N	\N	f	f	\N
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.orders (id, "trackingNumber", "senderId", "senderName", "senderPhone", "senderAddress", "senderLat", "senderLng", "senderBranchId", "receiverId", "receiverName", "receiverPhone", "receiverAddress", "receiverLat", "receiverLng", "receiverLocationSource", "originBranchId", "destBranchId", "courierId", "distanceKm", "totalWeightKg", "totalVolumeL", "isFragile", "isRefrigerated", "packageDescription", "deliveryFee", "codAmount", "courierEarning", "platformFee", "pricingBreakdown", "paymentParty", "paymentMethod", "paymentStatus", status, "createdAt", "paidAt", "assignedAt", "pickedUpAt", "deliveredAt", "failedAt", "cancelledAt", "deliveryPhotoUrl", "deliverySignatureUrl", "deliveryOtp", "receiverConfirmed", "failureReason", "trackingUrl", "trackingToken", "lastCourierLat", "lastCourierLng", "lastTrackedAt", "estimatedArrival", "createdById", "qrCodeImageUrl", "qrCodePayload", "qrCodeSignature", "trackingTokenExpiresAt", "trackingTokenRevokedAt", "trackingTokenSetAt") FROM stdin;
cmuvdqknb000fzv0lllbgzz3e	ETH-2026-EH10SU	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	251988107722	2P78+6HF, 2P78+6HF, Kolfe Keranio, Addis Ababa	9.0130965	38.7162381	\N	\N	Bamlak	251912345678	2QF2+HMQ, 2QF2+HMQ, Arada, Addis Ababa, Addis Ababa	9.02386238476959	38.75249985605478	manual	\N	\N	\N	4.16	1	0	f	f	\N	147.4	0	88.44	58.96	{"total": 147.4, "baseFee": 50, "currency": "ETB", "subtotal": 147.4, "weightCharge": 20, "distanceCharge": 62.4, "itemSurcharges": 15, "regionMultiplier": 1}	SENDER	CHAPA	PAID	PAID	2026-10-05 15:03:26.471	2026-10-05 15:11:14.805	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	http://localhost:5174/track/f15dbcc09eb045b5100a29b37f273a56	f15dbcc09eb045b5100a29b37f273a56	\N	\N	\N	\N	\N	data:image/png;base64,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	http://localhost:5174/q/ETH-2026-EH10SU?s=a94dd9	a94dd9	\N	\N	\N
cmv56sy8p000wo8ibc2hkjnwc	ETH-2026-LB649S	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	251988107722	hawasa	4	6	\N	\N	Mahi Xyz	251988558855	hawasa	8.9915392	38.715392	link	\N	\N	cmulbjk4f000h11x1aefdselg	\N	5	0	f	f	\N	150	0	90	60	{"total": 150, "baseFee": 50, "currency": "ETB", "subtotal": 150, "weightCharge": 100, "distanceCharge": 0, "itemSurcharges": 0, "regionMultiplier": 1}	SENDER	\N	PENDING	ASSIGNED	2026-10-12 11:47:01.85	\N	2026-10-12 11:58:17.545	\N	\N	\N	\N	\N	\N	\N	f	\N	http://localhost:5174/track/04255fa44a9b71eb44caa96d403e4a53	04255fa44a9b71eb44caa96d403e4a53	\N	\N	\N	\N	\N	data:image/png;base64,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	http://localhost:5174/q/ETH-2026-LB649S?s=40dc7b	40dc7b	\N	\N	\N
cmv55on4t0007o8ib614kv7a4	ETH-2026-VJGH55	cmumkdu8b0003rpfmjtl2wd2i	Dess Dev	251988107722	hawasa	4	6	\N	\N	Hamza	251911223344	adama	8.9915392	38.715392	link	\N	\N	cmulbjk4f000h11x1aefdselg	\N	4	0	f	f	\N	130	0	78	52	{"total": 130, "baseFee": 50, "currency": "ETB", "subtotal": 130, "weightCharge": 80, "distanceCharge": 0, "itemSurcharges": 0, "regionMultiplier": 1}	SENDER	\N	PENDING	ASSIGNED	2026-10-12 11:15:41.214	\N	2026-10-12 11:35:36.001	\N	\N	\N	\N	\N	\N	\N	f	\N	http://localhost:5174/track/6561ba50cb15a3dc1d1a2ebe52d064b8	6561ba50cb15a3dc1d1a2ebe52d064b8	\N	\N	\N	\N	\N	data:image/png;base64,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	http://localhost:5174/q/ETH-2026-VJGH55?s=f9a03a	f9a03a	\N	\N	\N
\.


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.otp_codes (id, phone, "accountType", "codeHash", purpose, attempts, used, "expiresAt", "createdAt", "staffId", "courierId", "customerId") FROM stdin;
cmulbeti3000111x1ip5g4894	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$p5cgmmo8A1vKpBVohWGMrg$gyBtp94YOikfVsbIxapaNrMlbseI/raFIo6+DgHqHeQ	login	0	t	2026-09-28 14:05:37.074	2026-09-28 14:00:37.083	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmulbhudr000d11x1qgfkgtbm	251988107722	STAFF	$argon2id$v=19$m=65536,t=3,p=4$sqE/9I37m1VWebVsdHHiOQ$lEfTSBIxFM50+/kK49pHhxsmXC5raFSTrv2a6a4Mzbo	login	0	t	2026-09-28 14:07:58.186	2026-09-28 14:02:58.191	cmulbhizl000b11x184arck41	\N	\N
cmulbk8ca000j11x18xr2jwrs	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$eomLOCEDd5ybKSOVXIarDA$s3U5WrEJ6HvgQGWgweV6a+4kAGRrbjkYXph37bEm5YA	login	0	t	2026-09-28 14:09:49.591	2026-09-28 14:04:49.594	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmulblosy000p11x1vdizheq2	251977777777	STAFF	$argon2id$v=19$m=65536,t=3,p=4$4fxtxLalJuR68eg8zMcYZg$bdJptS26iRgZ1x6ohtZ4fnq/IPuRCC+17SXFGnFNfLQ	login	0	t	2026-09-28 14:10:57.581	2026-09-28 14:05:57.587	cmulbl6ae000n11x1eyj03b53	\N	\N
cmulbrxb5000v11x1q4jj9sv3	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$v0M0NDlzc/QpaLt+xGw4gA$5fzIZ9nMwr2NbvNxLYqaEgYfT3GY+mMpH+5755b2ym0	login	0	t	2026-09-28 14:15:48.536	2026-09-28 14:10:48.545	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumlcsqx0003svydpkecjmu7	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$TYR4ytnj94ejJOjTKtm7Hg$zl4xYoZbdKKlVv8c63kiBCuHYHdRl9mFjLatT87DNfk	login	0	t	2026-09-29 11:31:45.125	2026-09-29 11:26:45.129	\N	cmulbjk4f000h11x1aefdselg	\N
cmumrfe0p000e13hsva8nbq4r	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$urW9QqutURCNINyCt+w5/Q$wGtdvSbvM1LiWnEMOsvIGfK+lqDnbDk7TowSICsmNcA	login	0	t	2026-09-29 14:21:43.702	2026-09-29 14:16:43.706	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtc2gk0002y86f8zxqzlyd	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$xlS43xEqC4WpKPAFlUtMyw$7w8S95DnLTExCq8LqxlFiTdSXRgiVQGGDfDxJKCh6ek	login	0	t	2026-09-29 15:15:07.976	2026-09-29 15:10:07.988	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtf0ow000ly86fxcaw8qph	251988107755	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$vJMJH/uopOGbRv8ZYzWdZw$+vxPwyiSshB8vuisyzQ4LM+x3JZhWlwaKHtmaqUQDuc	login	0	t	2026-09-29 15:17:25.662	2026-09-29 15:12:25.664	\N	\N	\N
cmumtjehe000ry86fxi4cjwrq	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$CJpP+rJNNYwUs/7vqfJZfw$1dgngHsrmwnNAAsk7A0Rr4sc44fDTtkhx/vpfGxZNq0	login	0	t	2026-09-29 15:20:50.159	2026-09-29 15:15:50.163	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjwue0014y86f6ddzarhu	251988107755	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$if/pcGBwgoigEnxPkxpO8g$MwyAJ8i7gJtfSHzFbKkSOja0yUlpPbRZqUyVdzLd2zI	login	0	t	2026-09-29 15:21:13.955	2026-09-29 15:16:13.959	\N	\N	\N
cmumtnn7w0019y86f7oc37m2f	251988107755	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$PihRDv3hTUpmrr4KRIYSGw$K7LHC5iW2v57RHk3xwzlb1HxpM4JQ+RTBRbhFBhs44Y	login	0	t	2026-09-29 15:24:08.095	2026-09-29 15:19:08.109	\N	\N	\N
cmumto483001hy86f3bttbmyx	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$9iD2CL2GpPtiWmPfM9gy8Q$FNZf7nOEuHbHtxlJjkfpoD663/YP7B6iAYyhbtDeoPQ	login	0	t	2026-09-29 15:24:30.144	2026-09-29 15:19:30.147	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtqccr001py86fh0j65zay	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$MS/hSEkA4urJh+1oy9EweQ$AjFdseYZfHhNx3FgwGFpbQ1gIbKbhLUB8XcXSqO+q3E	login	0	t	2026-09-29 15:26:13.992	2026-09-29 15:21:13.995	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtzivi001wy86fxq4it8vf	251988107755	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$PWSKqGkaTOEVGIWAY4DBIA$aoOYfqI//mFpcLy5lWTqSvyyrHNw7/fJbDGt3TA/9lk	login	0	t	2026-09-29 15:33:22.339	2026-09-29 15:28:22.35	\N	\N	\N
cmumtzzth0022y86f70vy0sq1	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$v5WDoz/R6CjHkCdY5Ki1xA$Vg4jJ06Hkr9tfPQrxCqSsAW7DSyB90yeenYT5QFaidE	login	0	t	2026-09-29 15:33:44.306	2026-09-29 15:28:44.309	\N	cmulbjk4f000h11x1aefdselg	\N
cmumrxg220000y86f94e56h10	251988888888	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$0BPrpok/MdD3+F4yXMjI9A$5OWiJd+cszN24r0uJsTAMyT43PQv5TS+8vYBTKtk/Go	login	0	t	2026-09-29 14:35:46.114	2026-09-29 14:30:46.154	\N	\N	\N
cmumzmno40012k1sudg3birwz	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$W+hhmhI67dRd4SuljQPR8w$cET8QFydvYk1vBJuX1yEFVLlCpJVTKEVfhIK/pdSBkw	login	0	t	2026-09-29 18:11:19.716	2026-09-29 18:06:19.732	\N	\N	\N
cmumu7mlx0002fg1ysxrp3cp9	251988888888	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$+bQDiDUKgiaIOMYYJKULtA$i1aAEYVBq/foJjMg5ENkAafxJUpb0oW6RyBtqfP/elA	login	1	t	2026-09-29 15:39:40.433	2026-09-29 15:34:40.438	\N	\N	\N
cmumu8myt0004fg1yhg9043fb	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$D7RN1iFpnC0WSYpgbDjiCg$ulMjIkYk/bHbKv6DEV36PCUscWiV3tU73SaHKsrG5ws	login	0	t	2026-09-29 15:40:27.553	2026-09-29 15:35:27.557	\N	cmulbjk4f000h11x1aefdselg	\N
cmumubzg8000efg1yh4gaqn9e	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$LnlSGUmKkkPc99zMrlb5Qg$9CmWj+56QA6hh4zT8sTTYS4GKl5iTbDG4Dr5kcsL0K4	login	0	t	2026-09-29 15:43:03.676	2026-09-29 15:38:03.704	\N	cmulbjk4f000h11x1aefdselg	\N
cmumufzi1000ofg1ynemngsgm	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$u9HABZO/fNdBjv7Otbbdtg$Iq5PiihZHEL/zH3U7XbmYWo3vaTco6f8+UVrh/W5/DE	login	0	t	2026-09-29 15:46:10.388	2026-09-29 15:41:10.393	\N	cmulbjk4f000h11x1aefdselg	\N
cmumunve0000vfg1y787x5xcp	251988107755	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$hvPw54MbS0O8Lr/Q5gd9GQ$8JdZHSrkmnoNxgXu6+XlN4j2e3w8thbhXLqT/fducf4	login	0	t	2026-09-29 15:52:18.304	2026-09-29 15:47:18.312	\N	\N	\N
cmumymgex0003k1sun4sgsv1n	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$0LgTPbhQ/bkORDvo/kN2yQ$lQKQkcWxhgNskJtxoxk3MhobTfxK4dazHt5/EnCTLq8	login	0	t	2026-09-29 17:43:10.698	2026-09-29 17:38:10.714	\N	cmulbjk4f000h11x1aefdselg	\N
cmumzptj2001hk1su1k7bdopf	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$NfJZTCS7SZtGOJ4wLkjm/Q$jDUWgPdwKZ5SJY6x33DRe6LhIgJ8XcXYBS4FiAvpNm8	login	0	t	2026-09-29 18:13:47.208	2026-09-29 18:08:47.294	\N	cmulbjk4f000h11x1aefdselg	\N
cmumzq3rv001jk1sudkutliqu	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$SOwjJmRsWAQtGq2ycgHoXA$5hsWwWc3oZD8SALQh/YgEnQkA/ognccoWAvKZ/dVFIY	login	0	t	2026-09-29 18:14:00.46	2026-09-29 18:09:00.56	\N	cmulbjk4f000h11x1aefdselg	\N
cmupuo6tj0000ur1jhk3tu8yn	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$ztL/nJIxAqgMCKzZjBf+1A$ZPIfplTkfCImYg6Kw60zuLt83wLWQmfhwgyA4CabNJY	login	0	t	2026-10-01 18:15:51.646	2026-10-01 18:10:51.655	\N	\N	\N
cmupuszwl0001ur1jfrx7181l	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$URrDaPh6qgnMjNlAC5sEZw$NHSXYdImCE8YJBSAqd3OB7p0CD6lmoShdAb8YAWdomc	login	0	t	2026-10-01 18:19:35.971	2026-10-01 18:14:35.974	\N	\N	\N
cmuputips00006v6eatnzfrjb	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$Inw2SP2/hA8aBtlcgjHSYQ$l6Dvyl4CsjVlzMZcUl06RA2R9VcZ4dYzfALjPJg6tDU	login	0	t	2026-10-01 18:20:00.348	2026-10-01 18:15:00.352	\N	\N	\N
cmupuwgho0000x0e4i88mqsp5	251956309313	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$PRORz5eamnOKnD5qu17pTg$DziaJ0Szw/9nbtoCgf0kt86E40wG9GVexq4fA8DkoO8	login	0	t	2026-10-01 18:22:17.434	2026-10-01 18:17:17.437	\N	\N	\N
cmupuxayf0000b0rvoou29dd3	251956309313	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$nqpR1qilnAzk8cwWTnHCUA$6uV6sFca9zh4a5Y4otZTvpWiF2qiE9uouNsmyremMSc	login	0	f	2026-10-01 18:22:56.915	2026-10-01 18:17:56.919	\N	\N	\N
cmuqmj10q00005yby0no789g0	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$b8k929jGmF3idDk4huxuLg$oDl08AHBqCipVQH6Lf6QP8brRlfMoJr7ESzocLOE2f4	login	0	t	2026-10-02 07:15:40.095	2026-10-02 07:10:40.107	\N	\N	\N
cmuqmnaie00015ybym69j782z	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$3X+hamaHv0sZm3uATkpzdw$mQW8r04rVIzKWCtbjUIl8RjX8Sod8083Qo/Na3aGIcI	login	0	t	2026-10-02 07:18:59.028	2026-10-02 07:13:59.031	\N	\N	\N
cmuqms1j7000b5yby5dev5e8a	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$mzDaq1kA4R9X4k6TEEyLkQ$FyCMGsmY46HJVg5rs4E/OXWt0nfbTFE1rszbGr0vO9E	login	0	t	2026-10-02 07:22:40.671	2026-10-02 07:17:40.675	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutuvgqs0001ulc9aza3dift	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$FjOSNQrUkPmVpy9Qjo5ZRw$7F8XGwIkjIivwsy2eJX/CGhrAZ5SlZjMP+7DFw4l1Gw	login	0	t	2026-10-04 13:32:35.803	2026-10-04 13:27:35.812	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutvct7p0000pbv6q5ew2l5w	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$aEMrYv4yzNnRmfLM57G08g$M5EY/082u1kE5xBEyV+I2W+XqKocky3O0o9cSBvxk18	login	0	t	2026-10-04 13:46:05.12	2026-10-04 13:41:05.125	\N	\N	\N
cmutx64yi0001eeiwld3t1kk9	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$vi/Qcf6XS3/8kOeeUHgDAg$n+GP6j4wTXIvvSviGQzJhQLP25glGsqVxaSDtyuUSrM	login	0	t	2026-10-04 14:36:52.982	2026-10-04 14:31:52.987	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutxh0px0007eeiw7lm482qi	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$HX5St+UQvcIFaOMNPnG7ng$etxZ8yveWry9acjF63T1Jp3se9bqN3QRfsIbBtmA9y4	login	0	t	2026-10-04 14:45:20.707	2026-10-04 14:40:20.71	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuty377p00019bqhkcgfkll5	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$/hrPCB8EP+YHGzsJxNHFLA$VuXBjvOQI8IgTHvdfRfjtO2c1ZhcC+OUXfQF8DO5Wss	login	0	t	2026-10-04 15:02:35.555	2026-10-04 14:57:35.558	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutyj70b0001a5m8bd2avdsm	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$9DUXkcn3Pk1wLGlbrBKiCQ$M9TcaMyWeN1dFfklMiHTkDYWxks2EuCP2djbnCVHXvI	login	0	t	2026-10-04 15:15:01.784	2026-10-04 15:10:01.787	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutysec200013kwau6tmne8m	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$XIIRoYl5ULGscxBk+M1jcQ$x7ImyhcZxsC5tbiCB+EzPLQ2Yw559I8S/06jZ2vXPkw	login	0	t	2026-10-04 15:22:11.182	2026-10-04 15:17:11.187	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutza4fk000360f1w1hkfol9	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$GbTESmWi46IZBQ0/CIxIsA$Z4OZrS9nPnaa88PmUtkRc6c0CAXHdgArvKmHpbf4EAs	login	0	t	2026-10-04 15:35:58.155	2026-10-04 15:30:58.16	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu04zoa0005vq7hz0ktdsuw	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$zd3c4CQgIPw/KxkLzXrqHw$AxlgLkPzVjqXFvfcgqOEX68kGMsGro+d27v5W7h1DD8	login	0	t	2026-10-04 15:59:58.326	2026-10-04 15:54:58.33	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu05xcl0009vq7h9gbnjrwi	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$N3WFPPO8jdFm2kFsNMVTfw$e1YG7eXiTxriFyefzSLtTIKu6/KFdozAOd3EqXfXwdY	login	0	t	2026-10-04 16:00:41.97	2026-10-04 15:55:41.973	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu69so80001wpfgpqgoeshp	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$pZNaxj1hk/DszMv+UjGgow$Mga/MRRTlToytvsm6oDWyWZfYUMhauktlkAWrhohvso	login	0	t	2026-10-04 18:51:40.229	2026-10-04 18:46:40.233	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu6baq00005wpfgzl2lr7mu	251988888888	COURIER	$argon2id$v=19$m=65536,t=3,p=4$1ILgMi8Cd5oDEoPKIHhwaw$3Vm1JWCLSiMvTnk6iqSlqegzyOYJlYVCGSo95plLBoA	login	0	t	2026-10-04 18:52:50.279	2026-10-04 18:47:50.281	\N	cmulbjk4f000h11x1aefdselg	\N
cmuu6czz6000cwpfgt2qejoxg	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$pP44YkZYETfu3BJ2Ll3+Jg$RUn5dKZTqrQwXuAwPcnj/bxJMuyXXxfQHIwNwT3e93E	login	0	t	2026-10-04 18:54:09.664	2026-10-04 18:49:09.666	\N	\N	\N
cmuu6k4ie000jwpfg1lzntlo7	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$t9fQOYxVQSL+O1IjDhs67A$WZLw49A46K8ZpE70yv/QLgu6T5G8iMkBiptg5HahemU	login	0	t	2026-10-04 18:59:42.132	2026-10-04 18:54:42.134	\N	\N	\N
cmuu6v66t0003m6t67maec9wk	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$kdk8yqJfyJMRtBQX/lrLhQ$2W63hLxdHZBkFzy6si1uaAexkozXHbZIr/gRQonG41c	login	0	t	2026-10-04 19:08:17.521	2026-10-04 19:03:17.525	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvdi4f60001zv0ltvfslhaq	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$qJzycucbJc8yKrMZ2wf0Hw$l3JsjmHDOv4ozh5CesxiOGRkiwZFbkwO+AimXkbrAQ8	login	0	t	2026-10-05 15:01:52.182	2026-10-05 14:56:52.193	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvdp9q00008zv0l2lxdxick	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$BN/zOtovpT0sIumUxtKZLA$pNhMfvFnqSuFTtSZLC2S+dmp3AjO0ZxxaMNR/gf4L2g	login	0	t	2026-10-05 15:07:25.653	2026-10-05 15:02:25.656	\N	\N	\N
cmuve41u60015zv0lmv0l5dcn	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$xMibjNeA9xWA5JJWGKopIA$IlEIt7+StshS+5FuVTfWSQ7pc5FW9b0q9Vum+pdUphE	login	0	t	2026-10-05 15:18:55.276	2026-10-05 15:13:55.279	\N	\N	\N
cmuvec1tq001azv0ld6cann5r	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$7EFOU5FdN204tX9I6/v+hg$ekdQmsdlZkrWCo299HH/gU4gsdRq5dPGR1jRQoeFR0k	login	0	t	2026-10-05 15:25:08.508	2026-10-05 15:20:08.511	\N	\N	\N
cmuvet526000314c18kaj18pc	251911111111	STAFF	$argon2id$v=19$m=65536,t=3,p=4$GS8vcVqKI072oKbKRTJ6zA$7UlEUcRiBCBi5NBgH2tiVmSrcXKRQSkO/tHGgIAiWL4	login	0	t	2026-10-05 15:38:25.851	2026-10-05 15:33:25.854	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvf68fa0000stwvd9tftt62	251988107722	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$i4it/h8dKO0eN5MWxiayOA$23RY9J/Jt84HNHb22QfUQybXORzzcHnpsFwkYQmT5+A	login	0	t	2026-10-05 15:48:36.739	2026-10-05 15:43:36.742	\N	\N	\N
cmv5328x5000d6jrjffu29d4p	251977777777	STAFF	$argon2id$v=19$m=65536,t=3,p=4$EKysK+sH0xCIfx0BReihVQ$LHfLqGTfP1IVq7GbeQniAYyfDxXBtpZc4YpZjoSjKqA	login	0	t	2026-10-12 10:07:17.113	2026-10-12 10:02:17.13	cmulbl6ae000n11x1eyj03b53	\N	\N
cmv53az8m0001jr4qnof2mbz2	251977777777	STAFF	$argon2id$v=19$m=65536,t=3,p=4$avocjLbZlz6HmjqwobXeKA$9cdn+LrGSor0H8Snvf2uE6shdd4wun9u6yX87a09P9o	login	0	t	2026-10-12 10:14:04.481	2026-10-12 10:09:04.486	cmulbl6ae000n11x1eyj03b53	\N	\N
cmv55t3xm000do8ibt4v8lry2	251911223344	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$PH9sgDJ11f/tsYKLHb5yHw$Jiw4B4pKcoxdvLwUrwMmIYtrrNFXgiTLKRXbRo4PDIs	receiver_link	0	t	2026-10-12 11:24:09.607	2026-10-12 11:19:09.61	\N	\N	\N
cmv571teb0014o8ib7fn9ngsc	251988558855	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$a3HBfHlatAxr0eMgUUiUxA$O0iDWsAE4J8TyQpBDsSaq8a1Xk9HyXMoKZyTtSa8/k4	receiver_link	1	t	2026-10-12 11:58:55.471	2026-10-12 11:53:55.476	\N	\N	\N
\.


--
-- Data for Name: payment_providers; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.payment_providers (id, code, name, description, type, "logoUrl", color, "sortOrder", "isEnabled", "isTestMode", "feePercent", "feeFixed", "minAmount", "maxAmount", "apiKey", "apiSecret", "merchantId", "webhookUrl", "configJson", "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
cmutzvatn0005roeq2q1gerlu	CHAPA	chapa	new chapa	CARD	\N	#3B82F6	0	t	t	0	0	1	100000000	CHAPUBK_TEST-2yc5AAfgcRkWEVOKzR3Gik5k0gpIntRi	CHASECK_TEST-O3AYKDqHp65hCkIyOJWoNj0nKjQ5bn65	sds	https://delivery-ethiopai-backend.onrender.com/api/v1/payments/chapa/webhook	\N	cmulbeozm0000wwkmn85nrqm6	cmulbeozm0000wwkmn85nrqm6	2026-10-04 15:47:26.219	2026-10-04 17:29:47.06
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.payments (id, "orderId", amount, currency, method, party, "gatewayRef", "gatewayPayload", status, "paidAt", "refundedAt", "refundAmount", "refundReason", "createdById", notes, "createdAt", "updatedAt") FROM stdin;
cmuve0b6z000vzv0l68q7zom2	cmuvdqknb000fzv0lllbgzz3e	147.4	ETB	CHAPA	SENDER	DEL-ETH-2026-EH10SU-c7d5ad72	{"data": {"meta": null, "mode": "test", "type": "API", "email": "yades.dev@gmail.com", "amount": 147.4, "charge": 3.69, "method": "test", "status": "success", "tx_ref": "DEL-ETH-2026-EH10SU-c7d5ad72", "currency": "ETB", "last_name": "Dev", "reference": "APvpUyBxqPqoN", "created_at": "2026-10-05T15:11:10.000000Z", "first_name": "Dess", "updated_at": "2026-10-05T15:11:10.000000Z", "phone_number": "251988107722", "customization": {"logo": null, "title": "Deliver Ethiopia", "description": "Order ETH-2026-EH10SU"}}, "status": "success", "message": "Payment details fetched successfully"}	PAID	2026-10-05 15:11:14.803	\N	\N	\N	\N	Chapa checkout initialized	2026-10-05 15:11:00.779	2026-10-05 15:11:14.804
cmv55vbq0000io8ib569hbv9p	cmv55on4t0007o8ib614kv7a4	130	ETB	CHAPA	SENDER	DEL-ETH-2026-VJGH55-c14ad93f	\N	PENDING	\N	\N	\N	\N	\N	Chapa checkout initialized	2026-10-12 11:20:53.016	2026-10-12 11:20:53.016
cmv55w9bd000ko8ib7kr8ix2z	cmv55on4t0007o8ib614kv7a4	130	ETB	CHAPA	SENDER	DEL-ETH-2026-VJGH55-ea3ad867	\N	PENDING	\N	\N	\N	\N	\N	Chapa checkout initialized	2026-10-12 11:21:36.553	2026-10-12 11:21:36.553
cmv55xe3r000mo8ibig4cn3ie	cmv55on4t0007o8ib614kv7a4	130	ETB	CHAPA	SENDER	DEL-ETH-2026-VJGH55-cb736982	\N	PENDING	\N	\N	\N	\N	\N	Chapa checkout initialized	2026-10-12 11:22:29.415	2026-10-12 11:22:29.415
cmv576tj30019o8iblu2r5b1q	cmv56sy8p000wo8ibc2hkjnwc	150	ETB	CHAPA	SENDER	DEL-ETH-2026-LB649S-b383b8c0	\N	PENDING	\N	\N	\N	\N	\N	Chapa checkout initialized	2026-10-12 11:57:48.927	2026-10-12 11:57:48.927
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.payouts (id, "courierId", "totalAmount", currency, "earningCount", "periodStart", "periodEnd", method, reference, status, "paidAt", "failureReason", "processedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: receiver_links; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.receiver_links (id, "orderId", "shortCode", "tokenHash", "receiverPhone", purpose, status, "sentViaSms", "sentViaTelegram", "sentViaWhatsapp", "openedAt", "openedIp", "filledAt", "filledIp", "otpVerified", "otpVerifiedAt", "capturedLat", "capturedLng", "capturedAccuracy", "capturedSource", "expiresAt", "createdById", "createdAt") FROM stdin;
cmv55on7v000co8ibmw8x3td8	cmv55on4t0007o8ib614kv7a4	M72TX5XR	$argon2id$v=19$m=65536,t=3,p=4$SFPTiTc7T68/UjCh4GNZLQ$XE1SGxmC0o2swQbQp0LGru55VYaL9ZXA8Fc46rrMCRg	251911223344	receiver_onboarding	USED	f	f	f	\N	\N	2026-10-12 11:20:08.581	\N	f	\N	\N	\N	\N	\N	2026-10-14 11:15:41.322	cmumkdu8b0003rpfmjtl2wd2i	2026-10-12 11:15:41.323
cmv56sych0011o8ib2bk9xoxs	cmv56sy8p000wo8ibc2hkjnwc	HADKYVP4	$argon2id$v=19$m=65536,t=3,p=4$VYeyTZmZTSFQIcOCvFksag$STipGNlDUPoxMV+7qX/ikGnG6ZO84lRKWtVVEsFOJjM	251988558855	receiver_onboarding	USED	f	f	f	\N	\N	2026-10-12 11:56:08.685	\N	f	\N	\N	\N	\N	\N	2026-10-14 11:47:01.984	cmumkdu8b0003rpfmjtl2wd2i	2026-10-12 11:47:01.985
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.refresh_tokens (id, "accountId", "accountType", "tokenHash", family, "userAgent", "ipAddress", "expiresAt", "revokedAt", "createdAt", "staffId", "courierId", "customerId") FROM stdin;
cmulbf7us000311x1hedjh38l	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$wuctuIx+5GLuFHyCrUnHlw$AhTltfRt1h/gnrsFuFm+QrPiTCAcXp8gXZWs3mdqwIU	dbb0ec07-9cc8-4bb6-b18d-2b2558863f42	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:00:55.682	2026-09-28 14:02:54.432	2026-09-28 14:00:55.684	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmulbi174000f11x1w8xo9z34	cmulbhizl000b11x184arck41	STAFF	$argon2id$v=19$m=65536,t=3,p=4$KtDvgRtP7z12p2ZuU/9fEw$fwHVNxzHTmVz0FzrXfKDzrSmGvHX92x2/dAmjX6xiJ4	5336985a-d9d2-4ab4-bd8d-d91f7257e37c	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:03:07.024	2026-09-28 14:04:39.941	2026-09-28 14:03:07.025	cmulbhizl000b11x184arck41	\N	\N
cmulbkfuj000l11x1tb6gigh3	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$tXj8HYYVDINgddsGhUyWJQ$3p4wbYF+WgZQ+kV/IoQh4W+vktYZSTvnjzdPyK87gx0	3a775120-9158-4548-a1b1-46433e6fc69e	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:04:59.322	2026-09-28 14:05:50.271	2026-09-28 14:04:59.323	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmulblvfl000r11x1vpwydk6i	cmulbl6ae000n11x1eyj03b53	STAFF	$argon2id$v=19$m=65536,t=3,p=4$yoiWPJ9eU93DF0GFzbtqjQ$yqyNbBxSDjabGwdbCMOy38hFABIEfL2/6Q6ydnOhxg8	a07534d1-2a35-4d76-96d4-f95d9a569418	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:06:06.176	2026-09-28 14:10:43.284	2026-09-28 14:06:06.177	cmulbl6ae000n11x1eyj03b53	\N	\N
cmulbs4io000x11x1neq6vocw	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$NXzBexaC/YiieGPz9skpMg$h8a0XD9hV+bFx9w+uPESZXRDsqeRcs5xovOGHdI2Bkk	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:10:57.886	2026-09-28 14:28:13.143	2026-09-28 14:10:57.888	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmulcebdv000z11x1vodusjk3	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$USeQu721fecp4omLBudspg$uJLmGmjVkf5lce9WYbwJ4wZ19GbxWRLAUik88QbFq1U	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-28 14:28:13.219	2026-09-29 10:58:54.069	2026-09-28 14:28:13.219	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumkczem0001rpfmhnr70zdb	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$r5hS5xAHkJrjPALHYPqwKg$kz5C7g1Eab9pcCBC6mS7HCHlrbasN8jUD7geilQfK90	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 10:58:54.141	2026-09-29 11:25:22.674	2026-09-29 10:58:54.142	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumlb19o0001svydwv2ra9r6	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$q4tyrgeFjJqzssFdIcFODQ$pDc36TbEpQOGHIHuZvbWGia11nZSJjl8DSixPznwN4o	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 11:25:22.859	2026-09-29 11:52:48.592	2026-09-29 11:25:22.86	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmummab8c000113hs4ycbdaid	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$mE7U1f4D9brVGVBV+xSpuw$CfonW+3UqeX08OIYkKEXTQTBLl3Rspe2FnmTkXMi2Dk	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 11:52:48.732	2026-09-29 13:16:11.171	2026-09-29 11:52:48.732	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmump9j96000c13hs2l4aeyjt	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$Xz06oOPwfnZax9Dxj2XECQ$NJNTy4swlAJe6LlVDfzNc9Smq8YglM8sgDBR7Cnhvpw	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 13:16:11.321	2026-09-29 14:19:46.302	2026-09-29 13:16:11.322	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumtc8ck0004y86fyt3dw2vn	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$55AswjRgyHkm0KWTYu1hwg$0L6X6TQJBqGjKozOFoP3qURSze9Bro4mvNhJ37QWkr0	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:15.619	2026-09-29 15:10:16.875	2026-09-29 15:10:15.62	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtc9eh0006y86fqikk7kdz	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$/HDwV1IuX4XGrbUyCmRmAg$2+pJZM3bM6aAYxqDE1XKdRpzqo0Q6yoNBRj8INYvWXw	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:16.984	2026-09-29 15:10:17.215	2026-09-29 15:10:16.985	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtc9ml0008y86fikac6y6k	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$sBWJM+5eAQh8mNNNEBnEWg$TQaJrlXxQwYxf07+JdtfXTZUXIsixM/sAx4iOZ5S6us	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:17.276	2026-09-29 15:10:17.587	2026-09-29 15:10:17.277	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtc9ws000ay86f3j3jor7j	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$2UhHtQSB50+5fVimUlvq9Q$gBnQ3msFVAmKrK7Eq/C06HSeeQP6UH8vlBq0McSJr8I	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:17.643	2026-09-29 15:10:17.833	2026-09-29 15:10:17.644	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtca3y000cy86f4fbllzdk	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$omYimX4W6XLU4SChRmHb3w$dnyu7QBpddSqYrRQEB/lndplX5bUrqmQhj7b3S3fLss	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:17.902	2026-09-29 15:10:18.264	2026-09-29 15:10:17.903	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtcafk000ey86fha4n5vxz	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$so4twR2/+VqW5/tg8sJdfw$IV+Pm0S5Yb/tGbW3tuDW8J045jRMX8Cf3PQPZZvORFM	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:18.32	2026-09-29 15:10:18.521	2026-09-29 15:10:18.32	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtcamu000gy86f9eca3smo	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$6MbcqmIHPJnIUNY1NfyKuQ$Daw5o3QkgeDkVISQ65UuENyJ7W7/XUlsZZkPi3B85XE	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:18.582	2026-09-29 15:10:18.839	2026-09-29 15:10:18.583	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtcavy000iy86fwr2r5hyo	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$hOfmySk9tkRSaF1y+1J5ng$FzSoLBLxkCIqa7bLGYFpkJ4Yp7umK8/UQ/JA0ZOA0ik	daedbfcf-67ab-4d96-a375-c0e8546034f3	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:10:18.909	2026-09-29 15:10:19.004	2026-09-29 15:10:18.91	\N	cmulbjk4f000h11x1aefdselg	\N
cmumrjb18000i13hsvapjtiv5	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$uYKcbc6V31gG/cIxo52PTg$V7umbKh4McqjZzRf56BdTso/9Tdsp0CgRYuUFHGhI7U	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 14:19:46.459	2026-09-29 15:12:00.582	2026-09-29 14:19:46.46	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumldz4t0005svyd4802bbcd	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$ZonTynwI/7kLhIbDrBGEeA$8zx2GuMAkRP6RJgVecoo8S3QKg30xABTiRN5r+bzhlE	c3ee2e4f-ed4e-46a2-9a57-5be36974a8a7	curl/8.5.0	127.0.0.1	2026-10-29 11:27:40.06	2026-09-29 15:34:30.463	2026-09-29 11:27:40.061	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtf64u000ny86fp8t8gnk2	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$iDaXXerO63/TIWC286qoxQ$TYiSO38MEBYB6sCICNIPKgxmzr3XLZlpsX3r4jgQIog	45399135-6c3d-45b7-9145-e669448f2a44	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:12:32.718	2026-09-29 15:12:33.818	2026-09-29 15:12:32.719	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumtjlqz000ty86fi1fnymi4	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$OGhEo74OdnwPpMi69mlCrQ$N0/EWImH5IrwM4XTN8A/8XYtxRuHfPu0QACFwotqFCU	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:15:59.579	2026-09-29 15:16:00.287	2026-09-29 15:15:59.58	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjmcf000vy86f7z0xnsn5	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$6qs8OG8ZJyT0CPvEMu11WQ$khBar0rPve34hpHRylqum+Z1lFEa70+ECIp81eXe/w0	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:00.35	2026-09-29 15:16:00.842	2026-09-29 15:16:00.351	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjms2000xy86f5pujrl8j	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$kIvIxWe2GdLpNZY2mjKmcQ$47m0zIQrz21Q0276ATvaIFmx9rUrRZ1edcpiMdHebx4	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:00.909	2026-09-29 15:16:01.096	2026-09-29 15:16:00.914	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjmzg000zy86fa0851pu8	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$dDtRU9zugv+mV1ax8ryGBA$JtoP/FCAlQOG/7yg9jRDmzG6mWO7Kvw4AAth7oZcqc0	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:01.18	2026-09-29 15:16:01.47	2026-09-29 15:16:01.181	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjn980011y86fhvqj5yb8	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$vIXtuoWtuYoVY9EgiSCtRA$SHel++cmvh2errhYob3sVKibmrIOApV9BXPedr1if+Q	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:01.532	2026-09-29 15:16:01.715	2026-09-29 15:16:01.533	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtjng20013y86fo69vkx76	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$t+vcZkb+2VrUrD0iKtcADw$RJ6Xw+vMHXZPuMIQQ6kVYtN6z4kfclUy8SvpAae0kfg	b933ba8f-3f52-4737-b86c-9ead0e992ad6	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:01.777	2026-09-29 15:16:02.016	2026-09-29 15:16:01.778	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtk45z0016y86f19ga49ls	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$bYhCgnjrQ8guUq7bBUS7aQ$XTDQLN8mCdT/RM4X6vc7Rx6idmK/fMaRNJuSJ1S+fH8	d090e60b-3898-4a09-a52c-f9885d55378b	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:16:23.447	2026-09-29 15:16:24.521	2026-09-29 15:16:23.448	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumtnt5b001by86f3n8b6c20	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$+AUryVHRnRhuszQnY2Mv0Q$SAWipE0nDSzGAXZJtjZuc8rRxTTt+/TnfTVPMicuRQ0	bf569a68-475f-4477-a027-2caf1049d479	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:19:15.79	2026-09-29 15:19:24.137	2026-09-29 15:19:15.791	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumto98a001jy86ftfgdjtc9	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$rYAkSyS3+B6Kd8FokG/PTQ$djMVCR0KccTj99tj0EZJZDswYuoEf/BY41i9dDoOTEM	f10aaed6-9b4d-4d87-8b08-41e092089d93	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:19:36.634	2026-09-29 15:19:38.747	2026-09-29 15:19:36.635	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtoawp001ly86fvt3y4987	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$THXlpeuYIlEPXJDeFd6Bnw$solOAEeuf5Mf5xYtLmkamfNfJRDEmvbgi6J5bqq+noE	f10aaed6-9b4d-4d87-8b08-41e092089d93	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:19:38.809	2026-09-29 15:19:39.222	2026-09-29 15:19:38.81	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtoba7001ny86fz46rdjd3	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$7Jnx7NswGqjmNYaErNTVgg$r864Cj0pxeZmgoL+OZbXeITr3hzzy9AosLpxxFFkC4s	f10aaed6-9b4d-4d87-8b08-41e092089d93	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:19:39.295	2026-09-29 15:19:39.428	2026-09-29 15:19:39.295	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtqs7b001ry86ftire7b2d	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$ag7qHW1D8g6UP9fWlU/KRQ$tdvdsedL3xap27BlYk8dfp5nrxJXbflFRdLXE3bEUac	bb89ea89-6113-47d5-9b8f-5444f8cb34c2	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:21:34.534	2026-09-29 15:21:35.369	2026-09-29 15:21:34.535	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtqswb001ty86f9hph8ni8	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$lJ+KTwSgYGatOePvKJ9xIA$K124Hw21IAcwXELGpPJOoBFbqKOUPIlnLSuoDZfjcMo	bb89ea89-6113-47d5-9b8f-5444f8cb34c2	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:21:35.434	2026-09-29 15:21:35.942	2026-09-29 15:21:35.435	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtqtc6001vy86fpszd1fpb	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$5nod33t1vYQ7bqCiuaZoWg$YrdPObzGtfBMNjQihWzwmXgNOBMQJxF/cHY6R8xyclI	bb89ea89-6113-47d5-9b8f-5444f8cb34c2	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:21:36.005	2026-09-29 15:21:36.086	2026-09-29 15:21:36.006	\N	cmulbjk4f000h11x1aefdselg	\N
cmumtzp4j001yy86fzod4wi34	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$rHrmXJvg15EzIbnMO+kmvQ$f7pC7IwCpO7KOfbdlbOB3rosVLStCLYFv3DqBlgdyoA	09bde1ce-a9cf-4c7c-86bd-5afeb793598d	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:28:30.45	2026-09-29 15:28:38.116	2026-09-29 15:28:30.451	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumtehfz000ky86fxv1cafg5	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$b9L01Tv6VHTa/U3YWg6PUg$Qe15IbEtMj+ewoucPupD9aDjNZUyFZvyrcgib+VuO0M	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 15:12:00.718	2026-09-29 15:34:21.792	2026-09-29 15:12:00.72	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumu06i90024y86f6lzeyror	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$ZS8FCOqXGeYsQhrXuWYCKA$iUEa4L2L2Et0eoCsECnGj6RsTZHuUV1T+Ppt55O+XcU	6d1f2120-6e9e-4cdc-98d1-9e72a637dd50	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:28:52.976	2026-09-29 15:34:30.463	2026-09-29 15:28:52.977	\N	cmulbjk4f000h11x1aefdselg	\N
cmumubsyp000afg1y1jyaad7z	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$OhJNTbJbSftCw6vPmfSddg$bRoEmaD/qX3DdrinUzid+WtVUqx6r8zSq7G4ivVPlDY	da21c424-c1f1-4926-a358-8891541aa9df	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:37:55.296	2026-09-29 15:37:55.499	2026-09-29 15:37:55.297	\N	cmulbjk4f000h11x1aefdselg	\N
cmumubt62000cfg1yoqkcpc12	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$LHtVoTV3napTLUZBELqITg$mu0JNxv8gK0+OoTN3L893r0ozkUE47PH15f9FpyvRMs	da21c424-c1f1-4926-a358-8891541aa9df	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:37:55.561	2026-09-29 15:37:55.632	2026-09-29 15:37:55.562	\N	cmulbjk4f000h11x1aefdselg	\N
cmumuc63j000gfg1ytpbp65mm	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$aFzv0m7jqGhjI9pokyNujQ$EFaCvg0yX57EWF6O3UKru23jNbXar/J5agoGX6OLrWE	a837f95d-a575-4d7d-8f51-805e95befbe1	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:38:12.318	2026-09-29 15:41:01.926	2026-09-29 15:38:12.319	\N	cmulbjk4f000h11x1aefdselg	\N
cmumu78cc0001fg1yfmcpx406	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$HqiCnENRHqkdI9CP1lhJcA$SZWpII7znwJ+CrZR/SbK5hHREvJc+77hbV69R5ZrrJY	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 15:34:21.946	2026-09-29 17:42:41.617	2026-09-29 15:34:21.947	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumrfuvi000g13hs9l0fop0j	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$DMONZij2V7tDxKPhiUwisQ$NoRrgPSheAo8Ctj4Vf8w2ANilsv8f31qh35ItXlZvgQ	e4cec845-76d2-42a7-b8f2-b6b5e3cf393c	curl/8.5.0	127.0.0.1	2026-10-29 14:17:05.55	2026-09-29 15:34:30.463	2026-09-29 14:17:05.551	\N	cmulbjk4f000h11x1aefdselg	\N
cmumu8tf20006fg1yemiiwjy6	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$CghtjQP395t4kUziy2BT4g$o2QByrWJ8Bdp5K2PvPFGDv4tYNY7GxetLrwKyIhAOUI	da21c424-c1f1-4926-a358-8891541aa9df	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:35:35.916	2026-09-29 15:37:55.23	2026-09-29 15:35:35.919	\N	cmulbjk4f000h11x1aefdselg	\N
cmumuft1c000kfg1yo9e6fjwi	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$ziwI5qxN2e96f31+9z/Qdw$zuk2UfsJnwO++jW6osSdcGSg62UhVrUsbwRiKQHtDGE	a837f95d-a575-4d7d-8f51-805e95befbe1	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:41:02.015	2026-09-29 15:41:02.233	2026-09-29 15:41:02.016	\N	cmulbjk4f000h11x1aefdselg	\N
cmumuft9s000mfg1ycdbl80mi	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$UR/f8Bb10F8HvseFAhVRXg$MQ0QHYG/Y2ODnbobOvx3khr1m2sBKrWSsj1oTRBSsB0	a837f95d-a575-4d7d-8f51-805e95befbe1	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:41:02.319	2026-09-29 15:41:02.39	2026-09-29 15:41:02.32	\N	cmulbjk4f000h11x1aefdselg	\N
cmumug5or000qfg1ygoxzuaak	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$4M0dz0DRKcWWbax3F/WuXg$UYk6Qfwmsz7i/w21xYcLois4T5YdQUwapoRrGw59xZg	6304ba59-4486-4a90-aaea-be2031fd128c	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:41:18.41	2026-09-29 15:47:11.611	2026-09-29 15:41:18.411	\N	cmulbjk4f000h11x1aefdselg	\N
cmumuo26p000xfg1y9j875s6v	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$DfdIi+Z7fBQ5iONFr2F7fg$vb7cb7cMl2p5685Z3eiA3yn/EQNl8hul6B+iZtomCbs	61353ec5-464d-4561-8688-4c3627162f07	Dart/3.13 (dart:io)	10.219.15.54	2026-10-29 15:47:27.12	2026-09-29 17:37:55.484	2026-09-29 15:47:27.121	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumym4vb0001k1sunqqg1v03	cmumkekcn0005rpfmsml45ocn	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$fF5JiXvZuqa5NBrVeYhX5g$kimKtY/3n2gx5I8gMx+xSrts01GbKDKyVrcO8M0iyb4	61353ec5-464d-4561-8688-4c3627162f07	Dart/3.13 (dart:io)	192.168.43.1	2026-10-29 17:37:55.748	2026-09-29 17:38:02.696	2026-09-29 17:37:55.75	\N	\N	cmumkekcn0005rpfmsml45ocn
cmumymn9k0005k1sun2te7aaa	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$8aLp2NMLp5lOHnBgHM8A5w$epfUY0rn/7PTM6HUGTM7Pq1LWxmkfXYNZPWqYnMACaw	5799ff0e-cbe1-4c78-b696-8ee7fa4dd798	Dart/3.13 (dart:io)	192.168.43.1	2026-10-29 17:38:19.592	2026-09-29 18:05:59.687	2026-09-29 17:38:19.593	\N	cmulbjk4f000h11x1aefdselg	\N
cmumzm8fo000zk1suuq9e8cis	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$IZ1wqFWl9nzyuSfgUFSElA$aCWqkaL9+mewoK7XosQcd/jBgcSPS2t/R51rALxeE9I	5799ff0e-cbe1-4c78-b696-8ee7fa4dd798	Dart/3.13 (dart:io)	192.168.43.1	2026-10-29 18:05:59.987	2026-09-29 18:06:02.996	2026-09-29 18:05:59.988	\N	cmulbjk4f000h11x1aefdselg	\N
cmumys9jy000fk1su15fw38v9	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$3iFQzV7InLsimnnySWOdzA$M3ZY5F56VJLgLSB5mgKjxnZqnGYU7qHfVBkR1KVUExI	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 17:42:41.757	2026-09-29 18:06:09.055	2026-09-29 17:42:41.758	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmumzmxpg0014k1sun6wc1avh	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$y+toB7v4IapwZuP1xUQl3w$UlseAmkcxbRWQorC/OBWOqwdC1TjvQJ5tHokcjumVkU	15812032-6087-4678-a8ce-18e4a975f78a	Dart/3.13 (dart:io)	192.168.43.1	2026-10-29 18:06:32.732	2026-09-29 18:07:58.524	2026-09-29 18:06:32.739	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmumzqcjb001lk1sues4diqyx	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$BNfTTTVrpXwGcDCev7ElKQ$YAbNkDgbQ+nBRlSMuPp3VOFPBP5BKCZFhmdqmwzsLJI	8c5f9148-a4f0-4f78-b846-6027c9ecba30	Dart/3.13 (dart:io)	192.168.43.1	2026-10-29 18:09:11.881	\N	2026-09-29 18:09:11.915	\N	cmulbjk4f000h11x1aefdselg	\N
cmumzmfmp0011k1su18yffhzi	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$E3xPV7ClJ8M3f2jeBrb7YQ$JFq3aR1LDRrgE5sMZF34xwGkptXoLf+43RXjWBswnxU	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 18:06:09.311	2026-09-29 18:27:02.344	2026-09-29 18:06:09.312	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmun0dal5000110f3lrh7v8us	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$8XaQ6n8FnUHd3nNvdyr6cg$nlx4lYHmvLOnp/a5glzKJn6k2p3QC0XdXPgn9F/ptzA	9eadb833-b3ca-4401-b146-df171647dddf	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-10-29 18:27:02.486	\N	2026-09-29 18:27:02.488	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuputs2y00026v6eghv6yir5	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$XwfWpUc4ywsGeHzfylsGEQ$glEQNBpYSE0+okKhlBvXZUohhE9wMFI5gIy2T/m3Ll0	e5784a4d-c029-45ee-98eb-3150d7e2dff9	Dart/3.13 (dart:io)	192.168.43.1	2026-10-31 18:15:12.49	2026-10-01 18:17:00.516	2026-10-01 18:15:12.491	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuqmsbkk000d5yby5s9nrc6h	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$Y/GEJPKOlKHzZEUha28EQw$QZ2K7sjmFNQpnBxjuAeteAXuLWybkM6/SLU5Bpho34o	ad33303e-f4b3-40cd-a648-045263ba214b	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-01 07:17:53.683	\N	2026-10-02 07:17:53.684	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuqmnfa200035ybye5car0tt	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$UC+nR0X2OEnezn2KY1g+0w$48g5EOunXDwRpu1m6gvFBdaFVqvoldIS7TzEEe2vGOw	548859e0-9209-4b89-b2c3-2152eac0fd76	Dart/3.13 (dart:io)	192.168.43.1	2026-11-01 07:14:05.209	2026-10-04 13:31:27.441	2026-10-02 07:14:05.21	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmutvdk2a0002pbv626wwd2ai	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$KsOfTOxj5RJ/Q8YxYYoqyA$2gmpj29QBOapvCTYV98wXgIZYTzN0SwZFL17oYeZkuE	37ed6e85-6c00-4d0e-a0e2-59a06d53afe1	curl/8.5.0	127.0.0.1	2026-11-03 13:41:39.921	\N	2026-10-04 13:41:39.922	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmutuvpqa0003ulc9x5d05x9m	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$fQ8hkTXpz9RBa6GOBZi+tA$zRYIiIWaHywhejzgQaN23CRXFt9KjTqNDVcK+ZqFHps	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 13:27:47.457	2026-10-04 13:49:56.344	2026-10-04 13:27:47.458	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutx70zr0003eeiwbd71u5tw	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$oMh8RgZMZg/an8+Xb910dg$lEMEVUBoEc9xibijemqOD1ytXM3PrVp9gP6pLIJqIcQ	d8d75001-2688-4ae4-b2e8-d938f14d5ab8	curl/8.5.0	127.0.0.1	2026-11-03 14:32:34.503	\N	2026-10-04 14:32:34.504	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutvo7790004pbv6icqiph2h	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$I2zv4TTtYVlUk+uhJgJgMg$SyFOsthukQ9y0U5wtKXeXzy0k8vqGxHGCj3vdfkZhe0	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 13:49:56.468	2026-10-04 14:34:04.152	2026-10-04 13:49:56.469	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutv0fif0005ulc90w6de7c3	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$nA5Cla7/X7Jw+ydYJBGRiQ$z2rvvf7Z0LfAOC1rVBn7OiPldSl6wqxKGJ78fpATWnI	548859e0-9209-4b89-b2c3-2152eac0fd76	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 13:31:27.494	2026-10-04 18:13:10.393	2026-10-04 13:31:27.495	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuvfchmi0004stwvgklsnrqz	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$o0DtLtOn8QwOWHr4VpshlQ$7+DRAs3nhtueSc5sYLTW+nhMUY1LvdHgVhR+wCAOFEA	ad823633-cddd-40f2-998e-7320535f3205	Dart/3.13 (dart:io)	10.113.143.54	2026-11-04 15:48:28.602	2026-10-12 11:11:07.895	2026-10-05 15:48:28.603	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmutxho4f0009eeiw91rsj6eg	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$dahY8kN3kys52d68OPdGnw$SxuHetpPTwSYh8xzQHD28VmQ4Ie56nNDV7FAPNFcs5M	2c8157db-0290-4999-a09a-d8d2ac6421e3	curl/8.5.0	127.0.0.1	2026-11-03 14:40:51.039	\N	2026-10-04 14:40:51.04	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuty3zdd00039bqhwgyxrlad	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$oRcThOEGlATxyV+1QJgVNw$cun5L5+a0zQzsljCkAo3fHk/YpcCXjOZZ1TgKDaoGBc	c85ee1ca-52c6-416b-b908-27b5b2d25dfd	curl/8.5.0	127.0.0.1	2026-11-03 14:58:12.048	\N	2026-10-04 14:58:12.049	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutx8y950005eeiwpkcbhj7w	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$EFnZYD9DcD/qKOqbFjq8eg$ouzDr8gkHipXwGVO9659XhGb9k/BOVQkB9fQgjZ8Qy4	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 14:34:04.264	2026-10-04 15:01:31.917	2026-10-04 14:34:04.265	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutyjuhp0003a5m8p5ha4f31	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$z2SNKPQPjgYJ2xP2JbT6qQ$XL3kQjs9qniAoSp0iw5ZLMyRG5uMP+1W/9P24SNDYdY	5dc24ecc-4c7b-44d1-b616-995389536841	curl/8.5.0	127.0.0.1	2026-11-03 15:10:32.22	\N	2026-10-04 15:10:32.221	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutysxam00033kwaewmtt3v2	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$5ydMpvAJhETOXfxj+wKgTA$rhsoV1TYPI67k8Bfj7vfKTvZBdaf13EjhTsPrLkZaho	971417ce-a8ee-4b7b-8c9a-4c39478825ce	curl/8.5.0	127.0.0.1	2026-11-03 15:17:35.757	\N	2026-10-04 15:17:35.758	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuty89nh0001psf2hotuvun4	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$LSgKXEUXEGF/8BQyYmFNNA$2eCDINStB7RNsec4IPStNwihRL3b+1rY/RPBjF8lJRw	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:01:31.996	2026-10-04 15:29:43.414	2026-10-04 15:01:31.997	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutz8ium000160f1cmovhw5i	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$LoxMGOeIUSqTkpmQ2UXyrg$lrROUZZF5neTxoqQuCZCov7FnW1Og+79YyRi+sJfMr4	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:29:43.533	2026-10-04 15:32:33.219	2026-10-04 15:29:43.534	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzc5vg000760f1yktd5puz	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$6h9pyZ64VBYnP+ykKI5rFA$RdaXCphDFBTSOsCJrjHZo+goWvvP9Qn863qxj/AT1WM	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:32:33.339	2026-10-04 15:41:56.998	2026-10-04 15:32:33.34	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzo8w4000114mrte2zv7sw	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$JfdHpavoVRPNLYfZCX83Lw$C8QP5YErx0MrlumvOL9O03PDjd7aeqCUYvF68VMyAog	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:41:57.123	2026-10-04 15:42:09.629	2026-10-04 15:41:57.124	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzae2p000560f107zzq776	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$EU4zE8gvOXitSD0yeksTEg$9LEsFuZ9qzB4ZzZGAX2Qv1CNaCAq2wT9Itkfov+iqXg	81d775c8-5f97-406e-abcd-25ca9e3d5951	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:31:10.656	2026-10-04 15:46:36.247	2026-10-04 15:31:10.657	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzu8dn0001roeqo2z3xv85	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$dDOaW/OhdS8pPFBNH2JE2A$A30KKH3zK7WORnX7HCT7SGYyhQCn6KaQ3dgNgV6DGVQ	81d775c8-5f97-406e-abcd-25ca9e3d5951	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:46:36.394	\N	2026-10-04 15:46:36.395	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzoimw000314mruhk19gpi	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$cNunkLbS1362DEP85YN9Xw$9nB8AMosJCoDGegn3SsoCkyKqIxPR3BHYUJwHs+ALmQ	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:42:09.751	2026-10-04 15:46:52.977	2026-10-04 15:42:09.752	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzul9f0003roeq7on9bo7g	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$GprQLD0j9DVb9ai2rTWGrw$5vQktR+d49PTP216J+HoZXGev/1jSfZ9ozhSQRRASrU	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:46:53.091	2026-10-04 15:47:53.561	2026-10-04 15:46:53.092	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzvw0j0007roeqrjaeieuk	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$A5YXaCcjNpG4blybmglrKg$x5lqD9/HXLOYO0wzzDZO3Ie1FJtNpxIT4PL5XCkYa0o	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:47:53.682	2026-10-04 15:48:04.389	2026-10-04 15:47:53.683	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmutzw4db0009roeqzew8k1r8	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$sutFpLChL5bFw4a9q20V2g$fFWp5teHSmsYaITjmt1et8DP1+6JVTSa4VxTLvnpcS4	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:48:04.51	2026-10-04 15:51:33.108	2026-10-04 15:48:04.511	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu00lf4000broeq60ysubum	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$P8NMCwAL4YtfjoqAG7Ozmw$sgGsardRsfuSXbu+vztYU+rucainVCsg3L5dp5YqX+A	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:51:33.231	2026-10-04 15:53:11.182	2026-10-04 15:51:33.232	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu02p3f0001vq7he6godii9	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$t0bPBAWBOuLnfHDdMT1r0w$Lymq9YX5XP0FnXH0DwJKA80CIzvA3CWkVHrHXfHWrhM	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:53:11.306	2026-10-04 15:53:39.956	2026-10-04 15:53:11.308	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu059vk0007vq7hvqdytz9q	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$W/4ns5VB0YuDcC8m4r3UDA$r+6t0OnftExwWj8RfcqQ5gg2FgraaUEnuMlPoY0f6hY	3871182e-0b4d-437d-8457-e7a27082519e	curl/8.5.0	127.0.0.1	2026-11-03 15:55:11.551	\N	2026-10-04 15:55:11.552	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu0691d000bvq7hlxlvacka	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$y7UauCHbZVK8S+61hpbl8w$V0MHO9rXd9Opsbfl4SSQ+FFgMVbs8dRu3mf4K/LUu+E	f45db286-e5b9-4ab6-9ce3-64a81f75edb1	curl/8.5.0	127.0.0.1	2026-11-03 15:55:57.12	\N	2026-10-04 15:55:57.121	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu03bal0003vq7hfgfce9vm	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$9eEQnyvFPXijxwOHktb31w$pNjgq8nPOyj0BYmEVviaiOFgYYclVw02t8DZICEvYGU	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 15:53:40.076	2026-10-04 16:08:40.33	2026-10-04 15:53:40.077	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu0mm100003283mcvq9wnwv	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$kLV/gf1w14qSemNgAEOOKw$ajOhQfQ5bmNbNC8PHiRPUwTSWkOwpK1WcKxKP7nOIew	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 16:08:40.451	2026-10-04 16:26:40.635	2026-10-04 16:08:40.452	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu19rln0001tegtz0ww3tsz	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$g6BHxzgIxC6TUtgkj9AZoQ$0uPcBVqyTDL3iAGkpJiwHpHdk5JTznh1HKF/zAC7OBo	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 16:26:40.762	2026-10-04 16:59:14.914	2026-10-04 16:26:40.763	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu2fnhm0003lhmyidi8fs89	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$hRef1L4tSi9lU1XHazwNKA$t8kwC7b4g5Lcc8SpMukl3VjtkGNB3IlWNI7VffhVlmM	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 16:59:14.986	2026-10-04 17:15:45.088	2026-10-04 16:59:14.987	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu30vim0001nqy24ho54o36	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$VPXancUbBKg7BeMSH7VXFQ$kEqe4ZJ3iR+Ky3sSKlc/YfAJ5KYsGOPGxNSrxV+jTfg	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 17:15:45.165	2026-10-04 17:40:56.786	2026-10-04 17:15:45.166	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu3x9ya000169muaiq04j8v	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$UPyLW3qEl8jMakFOI/bKmg$1vKgM+lM/4eDmU4us6kaLL7BFKYK92mAnlWLDItp4Ko	25e319fb-c65a-4c5e-ae9d-f70fd809b6b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 17:40:56.866	\N	2026-10-04 17:40:56.867	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu52py4000569mup02fkri7	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$i3WwUKBTMcp1J+w0KLcjHg$sJaafGbuVSIGDhWKN0cdelNRJZDsGXUIXh6E5PSUgQQ	548859e0-9209-4b89-b2c3-2152eac0fd76	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 18:13:10.491	2026-10-04 18:28:26.662	2026-10-04 18:13:10.492	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuu5mcxk000k69muaszn1hbt	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$nchRITOegzAi151fvnojSg$7EODA8BPwS9qNWzp0Ge2gRj/vDHtG/6WZfrWAgjXxHs	548859e0-9209-4b89-b2c3-2152eac0fd76	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 18:28:26.744	2026-10-04 18:43:30.34	2026-10-04 18:28:26.745	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuu6a39r0003wpfg8cdamzec	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$05i2CULO75EhEdvgOoXPrA$/Xd9GZdYJNDZJmDAQUi2w9c4KF8ob4O63d9IUb8ZKsQ	70277067-1c3f-4c5c-aea6-0a91ca16bde4	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36	127.0.0.1	2026-11-03 18:46:53.966	\N	2026-10-04 18:46:53.968	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuu65q730003ziy4cjmk8lev	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$yWKVDlWSXrti3FUSb4GF4g$Udl0CfqiMHxzg4ti04y1oGPXhZ1Zk8R6QdCHgjHL5Hk	548859e0-9209-4b89-b2c3-2152eac0fd76	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 18:43:30.398	2026-10-04 18:47:41.345	2026-10-04 18:43:30.399	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuu6binc0007wpfg1kfthk2e	cmulbjk4f000h11x1aefdselg	COURIER	$argon2id$v=19$m=65536,t=3,p=4$g4KZODY1EiilCal4qj3oAw$+qpfgDzxDo8uceO4TpoK+4qZDu+CLwb4hrYlaez4nrQ	62e2a40e-8c81-4c55-b6d6-67c4c7a45ccc	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 18:48:00.552	2026-10-04 18:49:02.838	2026-10-04 18:48:00.553	\N	cmulbjk4f000h11x1aefdselg	\N
cmuu6db6p000ewpfg2ek6e42r	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$JkALS8zLMMRqnDqcympByg$M8DLBwpuMKzNRSZbqyj/EDDrLZ5JEGcR8HDyK/LL4u0	2ef66292-b7b4-48e3-b68c-b5f149809f83	Dart/3.13 (dart:io)	192.168.43.1	2026-11-03 18:49:24.192	\N	2026-10-04 18:49:24.193	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuu6kroq000lwpfgs10pp2f7	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$z+d9K/9eDPe+pWn/D9+fTQ$OoljB1J3WZdGDkxhAADPgoA5j6WhB+snm7/DYHsknz8	548b201c-7490-457b-b156-e40b37639c1c	curl/8.5.0	127.0.0.1	2026-11-03 18:55:12.17	\N	2026-10-04 18:55:12.171	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuu6vt0l0005m6t6bnacsg75	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$QsK1AmNVYevXUXx4dcMkKQ$DWUbKGlz9badeIPs2mg8lgU162HQo3ffOd7MYDWKRNs	2e3b8739-96a7-4299-bfdb-71c57cea9dad	curl/8.5.0	127.0.0.1	2026-11-03 19:03:47.108	\N	2026-10-04 19:03:47.109	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvdibv30003zv0loov78suv	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$+7K4iKPdohwzDv2+p8i8lA$EkBXB9AQZTyyLE0E0JvadDazZMh2QDNd7bymOL9TF+s	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	127.0.0.1	2026-11-04 14:57:01.838	2026-10-05 15:12:29.465	2026-10-05 14:57:01.839	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuve4ui60017zv0leo4d7sve	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$Qyu68bX8OGfjNURUnSNDPA$a+PxCzcBnpcrLSo7PZs9Ybt0ozxtIvqXPXeokTFsWYI	cd21b6b7-ba7b-4b60-bdad-472ce70c24fe	curl/8.5.0	127.0.0.1	2026-11-04 15:14:32.429	\N	2026-10-05 15:14:32.43	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuvdphfa000azv0l03s0b9jw	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$9QA1z1If1XQ4w/ZhLuNoxQ$k40rMpWvBtVM3WHe6JQmPEEe2PcylbnMAoXqhhJ3eI4	be009b9c-ffbc-4418-9a39-184144af574b	Dart/3.13 (dart:io)	10.113.143.54	2026-11-04 15:02:35.638	2026-10-05 15:19:59.489	2026-10-05 15:02:35.639	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuvebuws0019zv0ljgd0ev1i	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$sPZVjqTpt7+v01wZunaJJg$uTir0ckkI3xBhfbBSSEYAOFn8NwMeB22BLnfAp+uq6E	be009b9c-ffbc-4418-9a39-184144af574b	Dart/3.13 (dart:io)	10.113.143.54	2026-11-04 15:19:59.548	2026-10-05 15:19:59.665	2026-10-05 15:19:59.549	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuve27oh0014zv0lvsr5blo6	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$76ZUgWTAefP0MMNhEJe0YA$Z7k6XmCfj673iOj4osEvKCGFB6PHQ9aq5Kh87umpRPg	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	127.0.0.1	2026-11-04 15:12:29.537	2026-10-05 15:32:04.475	2026-10-05 15:12:29.538	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvetq27000514c1d08c42gv	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$jmwTrfd4BSj1Hn/YZbkjRQ$Pk3EIjV2pqCp94+bbiVuvMxSVPIVywtyH5UMA+ggyCs	ad84da88-7a0e-4928-80c6-97109b79ea79	curl/8.5.0	127.0.0.1	2026-11-04 15:33:53.071	\N	2026-10-05 15:33:53.072	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvf6pli0002stwvjge68es7	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$vQXK6nhwCbSR9Fb1LEOGDQ$lOUPSeir12J6Bf+7VNwmjLrVM9SlLi/oWvygTA88M3k	ad44954f-168f-4e07-8c18-ea3e775395dd	curl/8.5.0	127.0.0.1	2026-11-04 15:43:58.997	\N	2026-10-05 15:43:58.998	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuvecdpu001czv0lxgpf679f	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$NkiqK6n0zrfegGK91EQiTA$PWupD8s1QcJZMcgVQQ+737EzvkVsS+9aPykrLedpCzE	ad823633-cddd-40f2-998e-7320535f3205	Dart/3.13 (dart:io)	10.113.143.54	2026-11-04 15:20:23.921	2026-10-05 15:48:28.516	2026-10-05 15:20:23.922	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmuvereb8000114c1sru69s8h	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$7jjgHM7aNgR3rVCyyc4Zzw$RJECT3b4CqoXmcKMByHlybHrgDtS8N4WUwwn/4FyPqE	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	127.0.0.1	2026-11-04 15:32:04.532	2026-10-05 15:48:29.436	2026-10-05 15:32:04.533	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmuvfcibb0006stwv70u3ynwh	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$CEensVtFpa5m6xmCp55bmQ$2TurKqNqKvHmLkwnSDgOgTPWG5+FVogVJ+0GYmf71rA	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	127.0.0.1	2026-11-04 15:48:29.494	2026-10-12 07:02:43.976	2026-10-05 15:48:29.495	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv4wncd100016jrj34xm8d1o	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$6HDxtmdmzmozzGauNYoQFQ$Sa4RRAgUWygmHe0Sg1702GeWJKLGdYxTZ7Sow/JYMVo	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 07:02:44.052	2026-10-12 07:18:07.186	2026-10-12 07:02:44.053	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv4x74p700036jrj9pbotfcc	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$2YFAVYtRTb4dKtoXJOvjYw$cdGjDHdV75jEapPAUjeZsVu93PEzOs3j98R0gXehdy8	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 07:18:07.242	2026-10-12 07:49:23.771	2026-10-12 07:18:07.243	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv4ybcqg00056jrjbabi5jlv	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$vS8/DIQZSbuEqu7RRCUeWA$Q8GlY3qwPE17o8qljWiOekCNnj1gReM4NM43US210ro	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 07:49:23.896	2026-10-12 08:21:36.925	2026-10-12 07:49:23.897	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv4zgsbc00076jrjghcqdjtt	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$/4/NBMQO7WAZWUSRIKpJCg$BwYch8hEGLDA9Hx1NKr5gdea9LeUFzx1P/g1hCGcD0A	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 08:21:36.983	2026-10-12 08:49:45.561	2026-10-12 08:21:36.984	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv50gzad00096jrjrknr72tf	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$RpSnm5Don45E6pVMRZKxGQ$d8Tq9JLvGlWn4DQ1Pn8380V5cdOMXFT2GUtjlbvSvb0	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 08:49:45.637	2026-10-12 09:55:26.905	2026-10-12 08:49:45.638	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv532i5j000f6jrjbsfzzrhr	cmulbl6ae000n11x1eyj03b53	STAFF	$argon2id$v=19$m=65536,t=3,p=4$QZ3QdcdBtYbJzNeJ5SlK+A$b6IU4atH/Uk93qwCQMkP+8XsDzWyOwF+k3PP+N9h2UM	8521bcde-22a6-49fd-8efb-74c73e3bed67	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 10:02:29.092	2026-10-12 10:02:41.456	2026-10-12 10:02:29.094	cmulbl6ae000n11x1eyj03b53	\N	\N
cmv53bm7g0003jr4q6j9q5m3a	cmulbl6ae000n11x1eyj03b53	STAFF	$argon2id$v=19$m=65536,t=3,p=4$Jq6QlpogapSHbiS+iGu3pA$f8sSOn+s4OhbE6kM9x0ub9Ds9h5rYU69QrTcY6I6jNU	6ff95404-69fa-4bb1-9500-473f1785c9b0	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 10:09:34.251	2026-10-12 10:09:57.517	2026-10-12 10:09:34.252	cmulbl6ae000n11x1eyj03b53	\N	\N
cmv52tgp1000b6jrjez6rdxfh	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$hn7r5BKHcF8zgDf/pkUjtQ$22d4Afh10htliFSWQb4SLer89/AY0K2xhaCasCh+1jg	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 09:55:27.3	2026-10-12 10:12:15.945	2026-10-12 09:55:27.301	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv53f3130001ixqplgkn6zs8	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$eNCaWdT53SDuXoYafcgbIA$MbT7mgU8bFfSqkza1XK0rxgdO6qnvWAV/FCK/DprnQM	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 10:12:16.023	2026-10-12 10:27:28.459	2026-10-12 10:12:16.024	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv53yn4a0003ixqplpx7cdr2	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$ge73QBi61kM9TfF9s4rryw$nHYwMfvFB4BW5UPkdCUbvpiQh7iKE1Ho9OZfPcPo/cE	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 10:27:28.522	2026-10-12 10:43:29.126	2026-10-12 10:27:28.522	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv54j8de0005ixqpo6ypnbeu	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$Qddw5Zqu2+/faLnv9qDIfw$HTMjdorWb7sFWZRpeNYngyTY5iq72SaZnuZCrgyHJlM	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 10:43:29.185	2026-10-12 11:14:53.015	2026-10-12 10:43:29.186	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv55nlzw0001o8ib366xycm0	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$0LAdGxRQzwcfrx4xCP9bow$NZGem3VAwXUifzhyZOS1E+1aML1cm7vb/26JCuxhdZc	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 11:14:53.083	2026-10-12 11:35:27.646	2026-10-12 11:14:53.084	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv55isa60001ig29kehm2jxx	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$sWXvotNCgGa02VeHjeyEqw$dBFoOjIrYQ4N0PEKUh6Qa0vJXoDtP7ChF/0Z0KniyDg	ad823633-cddd-40f2-998e-7320535f3205	Dart/3.13 (dart:io)	192.168.1.33	2026-11-11 11:11:07.949	2026-10-12 11:46:12.166	2026-10-12 11:11:07.95	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmv56rvy8000to8ibxoiygipw	cmumkdu8b0003rpfmjtl2wd2i	CUSTOMER	$argon2id$v=19$m=65536,t=3,p=4$GSkI2ISKULGyJzrxghdiBw$ViwH9B7Kxi+dznj4F0nrgJZWS12/CCg4vGjGAzftIrc	ad823633-cddd-40f2-998e-7320535f3205	Dart/3.13 (dart:io)	192.168.1.33	2026-11-11 11:46:12.223	\N	2026-10-12 11:46:12.224	\N	\N	cmumkdu8b0003rpfmjtl2wd2i
cmv56e2nb000oo8ibxnp7sjk6	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$Kx1Wcgghk2xEHEx9ZxZVpg$pyuzEHsM9BznYwiYZXmNa9vCjsgMn2ieerMDkaFTHok	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 11:35:27.718	2026-10-12 11:52:01.057	2026-10-12 11:35:27.719	cmulbeozm0000wwkmn85nrqm6	\N	\N
cmv56zd610013o8ibeinqzrme	cmulbeozm0000wwkmn85nrqm6	STAFF	$argon2id$v=19$m=65536,t=3,p=4$nK6s8SBHv/0lZ4jUQh1vjA$slSXxmiLXtcI8cqxq6f4gZGZWqvYQNT0fcF5e5jekIo	68bf7d3a-6e15-4e79-bb22-7100dc514ef3	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	127.0.0.1	2026-11-11 11:52:01.129	\N	2026-10-12 11:52:01.13	cmulbeozm0000wwkmn85nrqm6	\N	\N
\.


--
-- Data for Name: regions; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.regions (id, name, code, "createdById", "createdAt") FROM stdin;
cmulbfveg000511x1qnpqz8cu	Oromia	OR	cmulbeozm0000wwkmn85nrqm6	2026-09-28 14:01:26.2
cmulbg1in000711x1ora6uiw7	Amhara	AM	cmulbeozm0000wwkmn85nrqm6	2026-09-28 14:01:34.127
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: deliver
--

COPY public.staff (id, phone, name, email, "passwordHash", "passwordChangedAt", "mustChangePassword", role, "regionId", "branchId", "isActive", "phoneVerified", "suspendedAt", "suspendedById", "createdById", "createdAt", "updatedAt") FROM stdin;
cmulbeozm0000wwkmn85nrqm6	251911111111	Super Admin	\N	\N	\N	f	SUPER_ADMIN	\N	\N	t	t	\N	\N	\N	2026-09-28 14:00:31.234	2026-09-28 14:00:31.234
cmulbhizl000b11x184arck41	251988107722	Dess yar	dess@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$Wha9iuTS1li1piUgbN4EFg$JVsavF6DrcB6lNBM3kfbTo0E1ElwZItNt0fhAt9WQzc	2026-09-28 14:02:43.424	t	REGIONAL_ADMIN	cmulbfveg000511x1qnpqz8cu	\N	t	t	\N	\N	cmulbeozm0000wwkmn85nrqm6	2026-09-28 14:02:43.425	2026-09-29 11:08:23.339
cmulbl6ae000n11x1eyj03b53	251977777777	Esubalew	esub@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$U/aKipv3u2gPix9V05YFUg$Q1Xc24oxf5RNIiwGyAIiTgOwmdf8jTlww7sJ+J9fflk	2026-10-12 10:02:07.621	t	REGIONAL_ADMIN	cmulbg1in000711x1ora6uiw7	\N	f	t	2026-10-12 10:09:57.509	cmulbeozm0000wwkmn85nrqm6	cmulbeozm0000wwkmn85nrqm6	2026-09-28 14:05:33.591	2026-10-12 10:09:57.51
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: courier_earnings courier_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.courier_earnings
    ADD CONSTRAINT courier_earnings_pkey PRIMARY KEY (id);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_events order_events_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT order_events_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: otp_codes otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT otp_codes_pkey PRIMARY KEY (id);


--
-- Name: payment_providers payment_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT payment_providers_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: receiver_links receiver_links_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.receiver_links
    ADD CONSTRAINT receiver_links_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: branches_code_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX branches_code_idx ON public.branches USING btree (code);


--
-- Name: branches_code_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX branches_code_key ON public.branches USING btree (code);


--
-- Name: branches_regionId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "branches_regionId_idx" ON public.branches USING btree ("regionId");


--
-- Name: courier_earnings_courierId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "courier_earnings_courierId_idx" ON public.courier_earnings USING btree ("courierId");


--
-- Name: courier_earnings_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "courier_earnings_orderId_idx" ON public.courier_earnings USING btree ("orderId");


--
-- Name: courier_earnings_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX courier_earnings_status_idx ON public.courier_earnings USING btree (status);


--
-- Name: couriers_branchId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "couriers_branchId_idx" ON public.couriers USING btree ("branchId");


--
-- Name: couriers_email_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX couriers_email_key ON public.couriers USING btree (email);


--
-- Name: couriers_phone_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX couriers_phone_idx ON public.couriers USING btree (phone);


--
-- Name: couriers_phone_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX couriers_phone_key ON public.couriers USING btree (phone);


--
-- Name: couriers_regionId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "couriers_regionId_idx" ON public.couriers USING btree ("regionId");


--
-- Name: couriers_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX couriers_status_idx ON public.couriers USING btree (status);


--
-- Name: customers_email_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX customers_email_key ON public.customers USING btree (email);


--
-- Name: customers_googleId_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "customers_googleId_key" ON public.customers USING btree ("googleId");


--
-- Name: customers_phone_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX customers_phone_idx ON public.customers USING btree (phone);


--
-- Name: customers_phone_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX customers_phone_key ON public.customers USING btree (phone);


--
-- Name: customers_registeredById_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "customers_registeredById_idx" ON public.customers USING btree ("registeredById");


--
-- Name: customers_telegramId_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "customers_telegramId_key" ON public.customers USING btree ("telegramId");


--
-- Name: device_tokens_accountType_isActive_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "device_tokens_accountType_isActive_idx" ON public.device_tokens USING btree ("accountType", "isActive");


--
-- Name: device_tokens_courierId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "device_tokens_courierId_idx" ON public.device_tokens USING btree ("courierId");


--
-- Name: device_tokens_customerId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "device_tokens_customerId_idx" ON public.device_tokens USING btree ("customerId");


--
-- Name: device_tokens_staffId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "device_tokens_staffId_idx" ON public.device_tokens USING btree ("staffId");


--
-- Name: device_tokens_token_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX device_tokens_token_key ON public.device_tokens USING btree (token);


--
-- Name: notifications_accountType_createdAt_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "notifications_accountType_createdAt_idx" ON public.notifications USING btree ("accountType", "createdAt");


--
-- Name: notifications_courierId_isRead_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "notifications_courierId_isRead_idx" ON public.notifications USING btree ("courierId", "isRead");


--
-- Name: notifications_customerId_isRead_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "notifications_customerId_isRead_idx" ON public.notifications USING btree ("customerId", "isRead");


--
-- Name: notifications_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "notifications_orderId_idx" ON public.notifications USING btree ("orderId");


--
-- Name: notifications_staffId_isRead_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "notifications_staffId_isRead_idx" ON public.notifications USING btree ("staffId", "isRead");


--
-- Name: order_events_createdAt_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "order_events_createdAt_idx" ON public.order_events USING btree ("createdAt");


--
-- Name: order_events_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "order_events_orderId_idx" ON public.order_events USING btree ("orderId");


--
-- Name: order_items_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "order_items_orderId_idx" ON public.order_items USING btree ("orderId");


--
-- Name: orders_courierId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "orders_courierId_idx" ON public.orders USING btree ("courierId");


--
-- Name: orders_receiverId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "orders_receiverId_idx" ON public.orders USING btree ("receiverId");


--
-- Name: orders_senderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "orders_senderId_idx" ON public.orders USING btree ("senderId");


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: orders_trackingNumber_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "orders_trackingNumber_idx" ON public.orders USING btree ("trackingNumber");


--
-- Name: orders_trackingNumber_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "orders_trackingNumber_key" ON public.orders USING btree ("trackingNumber");


--
-- Name: orders_trackingToken_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "orders_trackingToken_idx" ON public.orders USING btree ("trackingToken");


--
-- Name: orders_trackingToken_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "orders_trackingToken_key" ON public.orders USING btree ("trackingToken");


--
-- Name: otp_codes_expiresAt_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "otp_codes_expiresAt_idx" ON public.otp_codes USING btree ("expiresAt");


--
-- Name: otp_codes_phone_accountType_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "otp_codes_phone_accountType_idx" ON public.otp_codes USING btree (phone, "accountType");


--
-- Name: payment_providers_code_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX payment_providers_code_idx ON public.payment_providers USING btree (code);


--
-- Name: payment_providers_code_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX payment_providers_code_key ON public.payment_providers USING btree (code);


--
-- Name: payment_providers_isEnabled_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "payment_providers_isEnabled_idx" ON public.payment_providers USING btree ("isEnabled");


--
-- Name: payments_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "payments_orderId_idx" ON public.payments USING btree ("orderId");


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payouts_courierId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "payouts_courierId_idx" ON public.payouts USING btree ("courierId");


--
-- Name: payouts_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX payouts_status_idx ON public.payouts USING btree (status);


--
-- Name: receiver_links_expiresAt_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "receiver_links_expiresAt_idx" ON public.receiver_links USING btree ("expiresAt");


--
-- Name: receiver_links_orderId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "receiver_links_orderId_idx" ON public.receiver_links USING btree ("orderId");


--
-- Name: receiver_links_shortCode_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "receiver_links_shortCode_idx" ON public.receiver_links USING btree ("shortCode");


--
-- Name: receiver_links_shortCode_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "receiver_links_shortCode_key" ON public.receiver_links USING btree ("shortCode");


--
-- Name: receiver_links_status_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX receiver_links_status_idx ON public.receiver_links USING btree (status);


--
-- Name: refresh_tokens_accountId_accountType_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "refresh_tokens_accountId_accountType_idx" ON public.refresh_tokens USING btree ("accountId", "accountType");


--
-- Name: refresh_tokens_family_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX refresh_tokens_family_idx ON public.refresh_tokens USING btree (family);


--
-- Name: refresh_tokens_tokenHash_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON public.refresh_tokens USING btree ("tokenHash");


--
-- Name: regions_code_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX regions_code_key ON public.regions USING btree (code);


--
-- Name: regions_name_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX regions_name_key ON public.regions USING btree (name);


--
-- Name: staff_email_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX staff_email_key ON public.staff USING btree (email);


--
-- Name: staff_phone_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX staff_phone_idx ON public.staff USING btree (phone);


--
-- Name: staff_phone_key; Type: INDEX; Schema: public; Owner: deliver
--

CREATE UNIQUE INDEX staff_phone_key ON public.staff USING btree (phone);


--
-- Name: staff_regionId_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX "staff_regionId_idx" ON public.staff USING btree ("regionId");


--
-- Name: staff_role_idx; Type: INDEX; Schema: public; Owner: deliver
--

CREATE INDEX staff_role_idx ON public.staff USING btree (role);


--
-- Name: branches branches_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "branches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: branches branches_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "branches_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: courier_earnings courier_earnings_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.courier_earnings
    ADD CONSTRAINT "courier_earnings_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: courier_earnings courier_earnings_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.courier_earnings
    ADD CONSTRAINT "courier_earnings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: courier_earnings courier_earnings_payoutId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.courier_earnings
    ADD CONSTRAINT "courier_earnings_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES public.payouts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: couriers couriers_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT "couriers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: couriers couriers_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT "couriers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: couriers couriers_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT "couriers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: couriers couriers_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT "couriers_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: couriers couriers_rejectedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT "couriers_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: customers customers_registeredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "customers_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: device_tokens device_tokens_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT "device_tokens_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT "device_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: device_tokens device_tokens_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT "device_tokens_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_events order_events_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.order_events
    ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_destBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_destBranchId_fkey" FOREIGN KEY ("destBranchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_originBranchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_originBranchId_fkey" FOREIGN KEY ("originBranchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orders orders_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: otp_codes otp_codes_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT "otp_codes_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: otp_codes otp_codes_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT "otp_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: otp_codes otp_codes_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.otp_codes
    ADD CONSTRAINT "otp_codes_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_providers payment_providers_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT "payment_providers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payment_providers payment_providers_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payment_providers
    ADD CONSTRAINT "payment_providers_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: payments payments_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payouts payouts_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT "payouts_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payouts payouts_processedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT "payouts_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: receiver_links receiver_links_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.receiver_links
    ADD CONSTRAINT "receiver_links_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public.couriers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: regions regions_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT "regions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: staff staff_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: staff staff_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: staff staff_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: staff staff_suspendedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: deliver
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT "staff_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES public.staff(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: deliver
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 4IRFcqMi4ZAueGUV9DlJ6zDylrVsn7V13jIP9tOOEoIhZe2TZT7acha3LXFezAM


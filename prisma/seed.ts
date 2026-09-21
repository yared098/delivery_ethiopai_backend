import { PrismaClient, Role } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
  if (digits.length === 9) return '251' + digits;
  throw new Error(`Invalid phone: ${phone}`);
}

async function seedSuperAdmin() {
  const rawPhone = process.env.SUPER_ADMIN_PHONE;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!rawPhone) {
    console.error('❌ SUPER_ADMIN_PHONE not set in .env');
    process.exit(1);
  }

  const phone = normalizePhone(rawPhone);

  console.log(`\n🔍 Checking for existing Super Admin...`);

  // Safety: refuse if ANY super admin exists
  const existing = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existing) {
    console.log(`⚠️  Super Admin already exists (id: ${existing.id}, phone: ${existing.phone})`);
    console.log(`   Skipping creation to avoid duplicates.`);
    return;
  }

  // Safety: if a user with this phone exists, upgrade them (don't duplicate)
  const byPhone = await prisma.user.findUnique({ where: { phone } });

  let superAdmin;

  if (byPhone) {
    console.log(`📝 User with phone ${phone} already exists — upgrading to SUPER_ADMIN`);
    superAdmin = await prisma.user.update({
      where: { id: byPhone.id },
      data: {
        role: Role.SUPER_ADMIN,
        name: byPhone.name || name,
        isActive: true,
        phoneVerified: true,
      },
    });
  } else {
    console.log(`✨ Creating new Super Admin...`);
    superAdmin = await prisma.user.create({
      data: {
        phone,
        name,
        role: Role.SUPER_ADMIN,
        isActive: true,
        phoneVerified: true,
      },
    });
  }

  console.log(`\n✅ Super Admin ready:`);
  console.log(`   ID:    ${superAdmin.id}`);
  console.log(`   Phone: ${superAdmin.phone}`);
  console.log(`   Name:  ${superAdmin.name}`);
  console.log(`   Role:  ${superAdmin.role}`);
  console.log(`\n👉 Login with this phone via OTP: POST /api/v1/auth/otp/request`);
  console.log(`   Body: { "phone": "${rawPhone}" }\n`);
}

seedSuperAdmin()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

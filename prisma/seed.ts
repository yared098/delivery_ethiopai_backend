import { PrismaClient, StaffRole } from '@prisma/client';
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

  const existing = await prisma.staff.findFirst({
    where: { role: StaffRole.SUPER_ADMIN },
  });

  if (existing) {
    console.log(`⚠️  Super Admin already exists (id: ${existing.id}, phone: ${existing.phone})`);
    console.log(`   Skipping creation.`);
    return;
  }

  const byPhone = await prisma.staff.findUnique({ where: { phone } });
  let superAdmin;

  if (byPhone) {
    console.log(`📝 Staff with phone ${phone} exists — upgrading to SUPER_ADMIN`);
    superAdmin = await prisma.staff.update({
      where: { id: byPhone.id },
      data: {
        role: StaffRole.SUPER_ADMIN,
        name: byPhone.name || name,
        isActive: true,
        phoneVerified: true,
      },
    });
  } else {
    console.log(`✨ Creating new Super Admin...`);
    superAdmin = await prisma.staff.create({
      data: {
        phone,
        name,
        role: StaffRole.SUPER_ADMIN,
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
  console.log(`\n👉 Login with this phone via OTP\n`);
}

seedSuperAdmin()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

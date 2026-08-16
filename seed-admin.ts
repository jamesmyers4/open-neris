import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  let dept = await prisma.department.findFirst({
    where: { name: "Test Department" },
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: "Test Department" },
    });
    console.log("created department:", dept);
  } else {
    console.log("found existing department:", dept);
  }
  const user = await prisma.user.create({
    data: {
      departmentId: dept.id,
      clerkId: "user_3Hzo9Gd0WXsX0wlssznOACfW3MS",
      name: "Jimmy Myers",
      email: "james.myers4@gmail.com",
      role: "ADMIN",
    },
  });
  console.log("created user:", user);
}

main().finally(() => prisma.$disconnect());

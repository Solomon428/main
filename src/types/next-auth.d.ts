import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      department?: string | null;
      employeeId?: string | null;
      organizationId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    department?: string | null;
    employeeId?: string | null;
    organizationId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    department?: string | null;
    employeeId?: string | null;
    organizationId?: string | null;
  }
}

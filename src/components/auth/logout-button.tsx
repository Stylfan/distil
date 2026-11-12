"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/controls";

export function LogoutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logoutAction();
          router.push("/login");
          router.refresh();
        })
      }
    >
      {t("logout")}
    </Button>
  );
}

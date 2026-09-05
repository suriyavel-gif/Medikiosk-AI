"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientHistoryIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/patient-history/569589b7-bcd1-49e7-a886-dd5199c46838");
  }, [router]);
  return null;
}

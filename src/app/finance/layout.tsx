import DashboardLayout from "@/components/layout/DashboardLayout"

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
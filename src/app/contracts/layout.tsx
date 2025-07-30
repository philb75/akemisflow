import DashboardLayout from "@/components/layout/DashboardLayout"

export default function ContractsLayout({
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
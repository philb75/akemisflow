import DashboardLayout from "@/components/layout/DashboardLayout"

export default function EntitiesLayout({
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
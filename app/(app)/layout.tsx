import { RoleProvider } from "@/context/RoleContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard>
			<RoleProvider>
				<div className="flex min-h-screen">
					<Sidebar />
					<main className="flex-1 overflow-y-auto p-6">{children}</main>
				</div>
			</RoleProvider>
		</AuthGuard>
	);
}

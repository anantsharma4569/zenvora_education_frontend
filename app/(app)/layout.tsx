import { RoleProvider } from "@/context/RoleContext";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard>
			<RoleProvider>
				<div className="flex min-h-screen flex-col md:flex-row">
					<Sidebar />
					<main className="min-w-0 flex-1 overflow-y-auto p-6">{children}</main>
				</div>
			</RoleProvider>
		</AuthGuard>
	);
}

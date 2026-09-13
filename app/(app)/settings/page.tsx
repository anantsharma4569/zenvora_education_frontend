import { PageHeader } from "@/components/PageHeader";
import { DepartmentSection } from "@/components/settings/DepartmentSection";
import { AcademicYearSection } from "@/components/settings/AcademicYearSection";
import { AcademicTermSection } from "@/components/settings/AcademicTermSection";
import { ProgramSection } from "@/components/settings/ProgramSection";
import { StudentGroupSection } from "@/components/settings/StudentGroupSection";
import { FeeCategorySection } from "@/components/settings/FeeCategorySection";
import { FeeStructureSection } from "@/components/settings/FeeStructureSection";

export default function SettingsPage() {
	return (
		<div>
			<PageHeader
				title="Settings"
				subtitle="One-time school setup - do this in order: Department → Academic Year → Academic Term → Program → Student Group → Fee Category → Fee Structure"
			/>
			<div className="flex flex-col gap-6">
				<DepartmentSection />
				<AcademicYearSection />
				<AcademicTermSection />
				<ProgramSection />
				<StudentGroupSection />
				<FeeCategorySection />
				<FeeStructureSection />
			</div>
		</div>
	);
}

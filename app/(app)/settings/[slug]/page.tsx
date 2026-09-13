import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { DepartmentSection } from "@/components/settings/DepartmentSection";
import { AcademicYearSection } from "@/components/settings/AcademicYearSection";
import { AcademicTermSection } from "@/components/settings/AcademicTermSection";
import { ProgramSection } from "@/components/settings/ProgramSection";
import { StudentGroupSection } from "@/components/settings/StudentGroupSection";
import { FeeCategorySection } from "@/components/settings/FeeCategorySection";
import { FeeStructureSection } from "@/components/settings/FeeStructureSection";

const SECTION_MAP: Record<string, ComponentType> = {
	departments: DepartmentSection,
	"academic-years": AcademicYearSection,
	"academic-terms": AcademicTermSection,
	programs: ProgramSection,
	"student-groups": StudentGroupSection,
	"fee-categories": FeeCategorySection,
	"fee-structures": FeeStructureSection,
};

export default async function SettingsItemPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const Section = SECTION_MAP[slug];
	if (!Section) notFound();

	return <Section />;
}

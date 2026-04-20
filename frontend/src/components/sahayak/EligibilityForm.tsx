import { useState } from "react";
import { motion } from "framer-motion";
import { User, FileText, IndianRupee, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/services/api";
import { MultiSelect } from "@/components/ui/multi-select";

export interface EligibilityProfile {
  disabilityTypes: string[];
  disabilityPercentage: number;
  annualIncome: number;
  state: string;
  age: number;
  gender: string;
  documentsAvailable: string[];
}

interface EligibilityFormProps {
  onSubmit: (profile: EligibilityProfile) => void;
}

const DISABILITY_TYPES = [
  "Visual Disability",
  "Hearing Disability",
  "Locomotor Disability",
  "Intellectual Disability",
  "Mental Illness",
  "Cerebral Palsy",
  "Autism Spectrum",
  "Multiple Disabilities",
  "Chronic Neurological",
  "Blood Disorder",
  "Acid Attack Victim",
  "Muscular Dystrophy",
  "Speech & Language",
  "Dwarfism",
  "Leprosy Cured",
  "Multiple Sclerosis",
  "Parkinson's Disease",
  "Sickle Cell Disease",
  "Thalassemia",
  "Hemophilia",
  "Specific Learning Disability",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const DOCUMENTS = [
  "UDID Card",
  "Aadhaar Card",
  "Disability Certificate",
  "Income Certificate",
  "Ration Card (BPL)",
  "Domicile Certificate",
  "Bank Account (Jan Dhan)",
  "Voter ID",
  "PAN Card",
  "School/College Certificate",
  "Medical Records",
  "Passport Size Photo",
];

const EligibilityForm = ({ onSubmit }: EligibilityFormProps) => {
  const [profile, setProfile] = useState<EligibilityProfile>({
    disabilityTypes: [],
    disabilityPercentage: 40,
    annualIncome: 0,
    state: "",
    age: 0,
    gender: "",
    documentsAvailable: [],
  });

  const toggleDocument = (doc: string) => {
    setProfile((prev) => ({
      ...prev,
      documentsAvailable: prev.documentsAvailable.includes(doc)
        ? prev.documentsAvailable.filter((d) => d !== doc)
        : [...prev.documentsAvailable, doc],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sync with backend profile
    try {
      const backendProfile = {
        disability_types: profile.disabilityTypes,
        disability_percentage: profile.disabilityPercentage,
        income_annual: profile.annualIncome,
        state: profile.state,
      };
      await api.post("/sahayak/profile", backendProfile);
      console.log("Backend profile synced");
    } catch (err) {
      console.error("Failed to sync profile to backend:", err);
      // Even if sync fails, we still proceed with the local UI update
    }
    
    onSubmit(profile);
  };

  return (
    <motion.section
      id="eligibility-form"
      className="py-16 px-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Check Your Eligibility
          </h2>
          <p className="text-muted-foreground text-lg">
            Tell us about yourself and we will find schemes ranked by how quickly you can apply.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card p-6 md:p-8 space-y-6 border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-4 h-4 text-primary" /> Age
              </Label>
              <Input
                type="number"
                min={0}
                max={120}
                placeholder="Enter your age"
                value={profile.age || ""}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-4 h-4 text-primary" /> Gender
              </Label>
              <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <FileText className="w-4 h-4 text-primary" /> Disability Types
              </Label>
              <MultiSelect
                options={DISABILITY_TYPES.map(t => ({ label: t, value: t }))}
                selected={profile.disabilityTypes}
                onChange={(selected) => setProfile({ ...profile, disabilityTypes: selected })}
                placeholder="Select disabilities..."
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                Disability Percentage (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 40"
                value={profile.disabilityPercentage || ""}
                onChange={(e) => setProfile({ ...profile, disabilityPercentage: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <IndianRupee className="w-4 h-4 text-primary" /> Annual Income (Rs)
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 200000"
                value={profile.annualIncome || ""}
                onChange={(e) => setProfile({ ...profile, annualIncome: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary" /> State
              </Label>
              <Select value={profile.state} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-foreground font-medium text-base">
              <FileText className="w-4 h-4 text-primary" /> Documents You Already Have
            </Label>
            <p className="text-sm text-muted-foreground">Select all that apply to help rank schemes by ease of application.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DOCUMENTS.map((doc) => (
                <label
                  key={doc}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                    profile.documentsAvailable.includes(doc)
                      ? "bg-sahayak-teal-light border-primary text-foreground"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={profile.documentsAvailable.includes(doc)}
                    onCheckedChange={() => toggleDocument(doc)}
                  />
                  {doc}
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full gradient-accent text-accent-foreground font-semibold text-lg py-6 rounded-xl hover:scale-[1.02] transition-transform"
          >
            Find My Schemes <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </div>
    </motion.section>
  );
};

export default EligibilityForm;

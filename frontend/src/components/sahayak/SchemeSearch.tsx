import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

interface SchemeSearchProps {
  onSearch: (query: string, category: string) => void;
}

const CATEGORIES = [
  "All Categories",
  "Education & Scholarship",
  "Employment & Skill",
  "Financial Assistance",
  "Healthcare",
  "Housing",
  "Transport & Travel",
  "Legal Rights",
  "Assistive Devices",
];

const SchemeSearch = ({ onSearch }: SchemeSearchProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, category);
  };

  return (
    <motion.section
      id="scheme-search"
      className="py-12 px-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">
            Search Government Schemes
          </h2>
          <p className="text-muted-foreground">
            Deep search across disability welfare schemes with AI-powered semantic matching.
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-card border border-border rounded-2xl shadow-card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. scholarship for visually impaired in Maharashtra"
              className="pl-10 h-12 text-base rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px] h-12 rounded-xl">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="lg" className="h-12 px-6 rounded-xl bg-primary text-primary-foreground">
              Search
            </Button>
          </div>
        </form>
      </div>
    </motion.section>
  );
};

export default SchemeSearch;

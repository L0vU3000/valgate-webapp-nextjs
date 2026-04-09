import { useNavigate } from "react-router";
import { CheckCircle } from "lucide-react";

export function Step6Success() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-full">
      <div className="border border-border rounded-xl shadow-lg p-10 max-w-[500px] w-full text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-[53px] h-[53px] text-[#059669]" />
        </div>
        <h2 className="text-[30px] text-foreground mb-1 font-display" style={{ fontWeight: 600 }}>
          Property Added Successfully!
        </h2>
        <p className="text-[14px] text-muted-foreground mb-4">
          Sunset Villa has been added to your Profile
        </p>

        <div className="border-t border-border" />
        <p className="text-[12px] text-muted-foreground my-2" style={{ fontWeight: 500 }}>
          Property ID: SR00015
        </p>
        <div className="border-t border-border mb-6" />

        <p className="text-[14px] text-foreground mb-3" style={{ fontWeight: 500 }}>
          What would you like to do next?
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate("/property/SR00015/ownership")}
            className="bg-primary text-white rounded-lg px-6 py-2 text-[14px] hover:bg-primary/90"
          >
            View Property Details
          </button>
          <button
            onClick={() => navigate("/add-property")}
            className="border border-border rounded-lg px-6 py-2 text-[14px] text-foreground hover:bg-accent/50"
          >
            Add Another Property
          </button>
          <button
            onClick={() => navigate("/portfolio")}
            className="text-primary text-[14px]"
          >
            Go to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

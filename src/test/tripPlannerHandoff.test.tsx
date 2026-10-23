import { act, cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import TripPlanner from "@/components/calculadora/TripPlanner";

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: React.ReactNode }) => children,
  useMapsLibrary: () => null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { key: "test-key" } }) },
    rpc: vi.fn().mockResolvedValue({ data: [] }),
  },
}));
vi.mock("@/lib/analytics", () => ({ analytics: { calculateTrip: vi.fn() } }));

afterEach(cleanup);
const props = { fuelType: "gasoline95" as const, fuelLabel: "95", consumption: 12, pricePerUnit: 1200 };

describe("station calculator handoff", () => {
  it("prefills the encoded destination and calculates the supplied 24 km", async () => {
    render(<MemoryRouter initialEntries={["/calculadora?km=24&dest=Estaci%C3%B3n%20Copec"]}><TripPlanner {...props} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue("Estación Copec")).toBeInTheDocument());
    expect(screen.getByText("24 km")).toBeInTheDocument();
    expect(screen.getByText("2.0 L")).toBeInTheDocument();
    expect(screen.getByText("$2.400")).toBeInTheDocument();
  });

  it.each(["", "-1", "NaN", "Infinity", "0"])("does not calculate an invalid distance %s", async (km) => {
    render(<MemoryRouter initialEntries={[`/calculadora?km=${km}&dest=Copec`]}><TripPlanner {...props} /></MemoryRouter>);
    await waitFor(() => expect(screen.getByDisplayValue("Copec")).toBeInTheDocument());
    expect(screen.queryByText("Tu ruta calculada")).not.toBeInTheDocument();
  });

  it("updates the handed-off cost when the current price loads", async () => {
    const view = render(<MemoryRouter initialEntries={["/calculadora?km=24&dest=Copec"]}><TripPlanner {...props} /></MemoryRouter>);
    await screen.findByText("$2.400");
    view.rerender(<MemoryRouter initialEntries={["/calculadora?km=24&dest=Copec"]}><TripPlanner {...props} pricePerUnit={1500} /></MemoryRouter>);
    await screen.findByText("$3.000");
  });

  it("does not restore handoff distance after selecting another trip", async () => {
    const view = render(<MemoryRouter initialEntries={["/calculadora?km=24&dest=Copec"]}><TripPlanner {...props} /></MemoryRouter>);
    await screen.findByText("24 km");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Rancagua/ }));
    });
    expect(screen.getByText("87 km")).toBeInTheDocument();
    view.rerender(<MemoryRouter initialEntries={["/calculadora?km=24&dest=Copec"]}><TripPlanner {...props} pricePerUnit={1500} /></MemoryRouter>);
    expect(screen.queryByText("24 km")).not.toBeInTheDocument();
    expect(screen.getByText("87 km")).toBeInTheDocument();
  });
});
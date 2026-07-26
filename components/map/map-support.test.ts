import { beforeEach, describe, expect, it, vi } from "vitest";

const mapboxMock = vi.hoisted(() => ({
  supported: vi.fn(),
  Map: vi.fn(),
}));

vi.mock("mapbox-gl", () => ({
  default: {
    supported: mapboxMock.supported,
    Map: mapboxMock.Map,
  },
}));

import { createMapIfSupported } from "./map-support";

const options = {
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mapboxMock.supported.mockReturnValue(true);
});

describe("createMapIfSupported", () => {
  it("does not construct a map when WebGL is unsupported", () => {
    mapboxMock.supported.mockReturnValue(false);

    const result = createMapIfSupported(options);

    expect(result).toBeNull();
    expect(mapboxMock.Map).not.toHaveBeenCalled();
  });

  it("returns null when Mapbox throws while creating the graphics context", () => {
    mapboxMock.Map.mockImplementationOnce(() => {
      throw new Error("Failed to initialize WebGL");
    });

    const result = createMapIfSupported(options);

    expect(result).toBeNull();
  });

  it("returns the created map when WebGL initialization succeeds", () => {
    const result = createMapIfSupported(options);

    expect(result).not.toBeNull();
    expect(mapboxMock.Map).toHaveBeenCalledWith(options);
  });
});

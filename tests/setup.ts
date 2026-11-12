/**
 * Tests import server modules that guard themselves with `server-only`, which
 * throws outside a React Server bundle. Vitest runs in plain Node, so the guard
 * is neutralised here. Nothing else is stubbed: the functions under test are
 * pure and never touch a database.
 */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

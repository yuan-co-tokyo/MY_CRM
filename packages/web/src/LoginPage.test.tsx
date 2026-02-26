import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "./LoginPage";

const defaultProps = {
  loginEmail: "",
  setLoginEmail: vi.fn(),
  loginPassword: "",
  setLoginPassword: vi.fn(),
  loggingIn: false,
  error: "",
  onLogin: vi.fn(),
};

describe("LoginPage", () => {
  it("renders email, password inputs and sign-in button", () => {
    render(<LoginPage {...defaultProps} />);

    expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("********")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("calls onLogin when Sign in button is clicked", () => {
    const onLogin = vi.fn();
    render(<LoginPage {...defaultProps} onLogin={onLogin} />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("shows error message when error prop is non-empty", () => {
    render(<LoginPage {...defaultProps} error="Invalid credentials" />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("calls onLogin when Enter is pressed in password field", () => {
    const onLogin = vi.fn();
    render(<LoginPage {...defaultProps} onLogin={onLogin} />);

    const passwordInput = screen.getByPlaceholderText("********");
    fireEvent.keyDown(passwordInput, { key: "Enter" });

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("shows 'Signing in...' text when loggingIn=true", () => {
    render(<LoginPage {...defaultProps} loggingIn={true} />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeInTheDocument();
  });
});

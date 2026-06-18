import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LoginPage from "./LoginPage";

const createProps = () => ({
  loginEmail: "",
  setLoginEmail: vi.fn(),
  loginPassword: "",
  setLoginPassword: vi.fn(),
  loggingIn: false,
  error: "",
  onLogin: vi.fn(),
});

describe("LoginPage", () => {
  it("renders email input", () => {
    render(<LoginPage {...createProps()} />);

    expect(screen.getByPlaceholderText("admin@example.com")).toBeInTheDocument();
  });

  it("renders password input", () => {
    render(<LoginPage {...createProps()} />);

    expect(screen.getByPlaceholderText("パスワードを入力")).toBeInTheDocument();
  });

  it("renders login button", () => {
    render(<LoginPage {...createProps()} />);

    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("calls onLogin when login button is clicked", () => {
    const onLogin = vi.fn();
    render(<LoginPage {...createProps()} onLogin={onLogin} />);

    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("calls onLogin when Enter is pressed in password field", () => {
    const onLogin = vi.fn();
    render(<LoginPage {...createProps()} onLogin={onLogin} />);

    const passwordInput = screen.getByPlaceholderText("パスワードを入力");
    fireEvent.keyDown(passwordInput, { key: "Enter" });

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("shows error banner when error prop is non-empty", () => {
    render(
      <LoginPage
        {...createProps()}
        error="メールアドレスまたはパスワードが正しくありません。"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "メールアドレスまたはパスワードが正しくありません。",
    );
  });

  it("disables submit button and shows loading text when loggingIn=true", () => {
    render(<LoginPage {...createProps()} loggingIn={true} />);

    const button = screen.getByRole("button", { name: "サインイン中…" });
    expect(button).toBeDisabled();
  });

  it("toggles password input type", () => {
    render(<LoginPage {...createProps()} />);

    const passwordInput = screen.getByPlaceholderText("パスワードを入力");
    const toggle = screen.getByRole("button", { name: "表示" });

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(toggle);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "非表示" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "非表示" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

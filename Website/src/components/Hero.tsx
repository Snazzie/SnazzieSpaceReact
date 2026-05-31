import SnazzieLogo from "@/components/icons/SnazzieLogo";
import { GithubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons/SocialIcons";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col items-center justify-center gap-8 px-6"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="w-[280px] md:w-[360px]">
          <SnazzieLogo />
        </div>
        <p className="text-muted-foreground">Software developer — C#, TypeScript, Rust</p>
        <div className="flex items-center gap-6">
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://github.com/snazzie" aria-label="GitHub">
            <GithubIcon />
          </a>
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://linkedin.com/in/cooper-a-m/" aria-label="LinkedIn">
            <LinkedInIcon />
          </a>
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://twitter.com/ItsSnazzie" aria-label="Twitter">
            <TwitterIcon />
          </a>
        </div>
      </div>
      <a
        href="#aboutme"
        aria-label="Scroll to about"
        className="absolute bottom-10 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown size={24} />
      </a>
    </section>
  );
}

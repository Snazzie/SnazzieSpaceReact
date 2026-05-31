import SnazzieLogo from "@/components/icons/SnazzieLogo";
import { GithubIcon, LinkedInIcon } from "@/components/icons/SocialIcons";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";

const SKILLS = ["C#", "TypeScript", "Rust", "Kubernetes", "Cloudflare"];

export function Intro() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] items-center px-6 pt-24 pb-20"
    >
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1.2fr_1fr] md:gap-16">
        {/* Left — intro */}
        <div id="aboutme" className="flex flex-col items-start gap-6 scroll-mt-24">
          <div className="w-[240px] md:w-[300px]">
            <SnazzieLogo />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Aaron
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              Software Developer
            </p>
          </div>

          <p className="max-w-md leading-relaxed text-muted-foreground">
            I build reliable software across the stack — from backend services to
            developer tools. I work mainly in C#, TypeScript and Rust, and ship to
            production on Kubernetes and Cloudflare, with a focus on performance,
            clean architecture and things that last.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {SKILLS.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={15} />
            England
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-5">
            <a
              href="#projects"
              className="group inline-flex items-center gap-2 rounded-md border border-border bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              View projects
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>

            <div className="flex items-center gap-5">
              <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://github.com/snazzie" aria-label="GitHub">
                <GithubIcon />
              </a>
              <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://linkedin.com/in/cooper-a-m/" aria-label="LinkedIn">
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>

        {/* Right — portrait */}
        <div className="order-first flex justify-center md:order-none md:justify-end">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_70%)] blur-2xl"
            />
            <img
              className="relative h-44 w-44 rounded-full border border-border object-cover md:h-72 md:w-72"
              alt="Aaron"
              src="https://avatars.githubusercontent.com/u/19627023?v=4"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

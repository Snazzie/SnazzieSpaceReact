import SnazzieLogo from "@/components/icons/SnazzieLogo";
import { GithubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons/SocialIcons";
import { CircleArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section id="home">
      <div className="grid h-full w-full content-center p-[10%]">
        <div>
          <SnazzieLogo />
          <div className="mx-auto grid w-1/2 grid-cols-[repeat(3,5em)] justify-center gap-x-12">
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://github.com/snazzie">
              <GithubIcon />
            </a>
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://linkedin.com/in/cooper-a-m/">
              <LinkedInIcon />
            </a>
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://twitter.com/ItsSnazzie">
              <TwitterIcon />
            </a>
          </div>
        </div>
        <div className="m-auto">
          <a className="scroll-arrow" href="#aboutme">
            <CircleArrowDown size={50} />
          </a>
        </div>
      </div>
    </section>
  );
}

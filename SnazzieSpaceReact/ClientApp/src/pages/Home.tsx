import React from "react";
import SnazzieLogo from "../resources/svg/SnazzieLogo";
import {
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
} from "../resources/svg/SocialIcons";
import "./home.scss";

export const Home: React.FunctionComponent = () => {
  return (
    <>
      <div className="landingPage">
        <div className="container">
          <SnazzieLogo />
          <div className="socialRow">
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/snazzie"
            >
              <GithubIcon />{" "}
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://linkedin.com/in/cooper-a-m/"
            >
              <LinkedInIcon />
            </a>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://twitter.com/ItsSnazzie"
            >
              <TwitterIcon />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

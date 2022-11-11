import React, { useEffect, useLayoutEffect } from "react";
import SnazzieLogo from "../assets/svg/SnazzieLogo";
import {
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
} from "../assets/svg/SocialIcons";
import "./home.scss";
import {
  ScrollingProvider,
  useScrollSections,
  Section,
  useScrollSection,
} from "react-scroll-section";
import { Layout, Menu, Card, PageHeader, Grid } from "antd";

import {
  UserOutlined,
  StarFilled,
  DownCircleOutlined,
} from "@ant-design/icons";
const { Sider, Header, Content } = Layout;

export const Home: React.FunctionComponent = () => {
  const sections = useScrollSections();

  const homeSection = useScrollSection("home");
  const projectsSection = useScrollSection("projects");

  return (
    <>
      <ScrollingProvider>
        <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
          <div className="logo" />
          <Menu theme="dark" mode="horizontal">
            <Menu.Item
              key="#home"
              icon={<UserOutlined />}
              onClick={() => (window.location.hash = "home")}
            >
              Home
            </Menu.Item>
            <Menu.Item
              key="#aboutme"
              icon={<StarFilled />}
              onClick={() => (window.location.hash = "aboutme")}
            >
              About me
            </Menu.Item>
            <Menu.Item
              key="#Projects"
              icon={<StarFilled />}
              onClick={() => (window.location.hash = "projects")}
            >
              Projects
            </Menu.Item>
          </Menu>
        </Header>
        <Section id="home">
          <div className="background"></div>
          <div className="container">
            <div>
              <SnazzieLogo />
              <div className="socialRow">
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://github.com/snazzie"
                >
                  <GithubIcon />{" "}
                </a>
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://linkedin.com/in/cooper-a-m/"
                >
                  <LinkedInIcon />
                </a>
                <a
                  target="_blank"
                  rel="noopener"
                  href="https://twitter.com/ItsSnazzie"
                >
                  <TwitterIcon />
                </a>
              </div>
            </div>
            <div style={{ margin: "auto" }}>
              <a href="#aboutme">
                <DownCircleOutlined />
              </a>
            </div>
          </div>
        </Section>
        <Section id="aboutme">
          <div className="container">
            <h1 style={{ justifySelf: "center", fontSize: 60 }}>About me</h1>
            <div className="aboutme">
              <img
                src="https://avatars.githubusercontent.com/u/19627023?v=4"
              />
              <p style={{ fontSize: 20 }}>
                Name: Aaron
                <br />
                Location: England
                <br />
                Loves Languages: C#, Typescript, Rust
                <br />
                Dislikes Languages: Javascript, Go, Python, Bash, Powershell,
                Xamarin, Ruby
                <br />
                Strength: Yo mama
                <br />
                Weakness: Energy drinks, alchohol and coffee makes him sleepy
              </p>
            </div>
          </div>
        </Section>
        <Section id="projects">
          <div className="container">
            <h1 style={{ justifySelf: "center", fontSize: 60 }}>Projects</h1>
            <div className="cards">
              <ProjectCard
                onClick={() =>
                  window.open("https://github.com/darkthemehub", "_blank")
                }
                imgSource={`https://avatars2.githubusercontent.com/u/55282763?s=400&u=6de6bebec65ca7e8102b96d354a2da3102919da9&v=4`}
                title="Dark Theme Hub"
                description="Dark themes for developers"
              />
              <ProjectCard
                onClick={() =>
                  window.open(
                    "https://github.com/DarkThemeHub/CssToStyleFiles",
                    "_blank"
                  )
                }
                imgSource={`https://avatars2.githubusercontent.com/u/55282763?s=400&u=6de6bebec65ca7e8102b96d354a2da3102919da9&v=4`}
                title="CssToStyleFiles"
                description="Generates multiple types of style files used for applying custom themes to websites"
              />
              <ProjectCard
                onClick={() =>
                  window.open(
                    "https://github.com/Vital-Utilities/Vital-Utilities",
                    "_blank"
                  )
                }
                imgSource={`https://avatars.githubusercontent.com/u/98346237?s=200&v=4`}
                title="Vital Utilities"
                description="Modern Windows Task Manager alternative with bells and whistles"
              />
              <ProjectCard
                onClick={() =>
                  window.open(
                    "https://github.com/Snazzie/Rhythm-Unity",
                    "_blank"
                  )
                }
                imgSource={`https://avatars.githubusercontent.com/u/19627023?v=4`}
                title="Rhythm Unity"
                description="OSU Clone made in Unity"
              />
            </div>
          </div>
        </Section>
      </ScrollingProvider>
    </>
  );
};

interface ProjectCardProps {
  onClick?: () => void;
  imgSource: string;
  title: string;
  description: string;
}

function ProjectCard(props: ProjectCardProps) {
  return (
    <div className="card" onClick={props.onClick}>
      <img
        alt="image"
        style={{ width: "100%", height: "auto", background: "#1d1d1d" }}
        src={props.imgSource}
      />
      <div className="detail">
        <h4>{props.title}</h4>
        <div>{props.description}</div>
      </div>
    </div>
  );
}

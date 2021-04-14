import React from "react";
import SnazzieLogo from "../resources/svg/SnazzieLogo";
import {
  GithubIcon,
  LinkedInIcon,
  TwitterIcon,
} from "../resources/svg/SocialIcons";
import "./home.scss";
import {
  ScrollingProvider,
  useScrollSections,
  Section,
  useScrollSection,
} from 'react-scroll-section';
import Meta from "antd/lib/card/Meta";
import { Layout, Menu, Card, PageHeader } from "antd";

import {
  UserOutlined,
  StarFilled,
  DownCircleOutlined
} from "@ant-design/icons";
const { Sider, Header, Content } = Layout;

export const Home: React.FunctionComponent = () => {
  const sections = useScrollSections();

  const homeSection = useScrollSection('home');
  const projectsSection = useScrollSection('projects');
  return (
    <>
      <ScrollingProvider>
        <Header style={{ position: 'fixed', zIndex: 1, width: '100%' }}>
          <div className="logo" />
          <Menu
            theme="dark"
            mode="horizontal"

          >
            <Menu.Item key="#home" icon={<UserOutlined />} onClick={homeSection.onClick}>
              Home
            </Menu.Item>
            <Menu.Item key="#Projects" icon={<StarFilled />} onClick={projectsSection.onClick}>
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
                  rel="noopener noreferrer"
                  href="https://github.com/snazzie"
                >
                  <GithubIcon />{" "}
                </a>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://linkedin.com/in/cooper-a-m/"
                >
                  <LinkedInIcon />
                </a>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://twitter.com/ItsSnazzie"
                >
                  <TwitterIcon />
                </a>
              </div>
            </div>
            <div style={{ margin: "auto" }}>
              <a href="#projects" >
                <DownCircleOutlined />
              </a>
            </div>
          </div>
        </Section>

        <Section id="projects">

          <div className="container">
            <PageHeader
              className="site-page-header"
              title="Projects"
            />
            <div className="grid">

              <Card
                hoverable
                onClick={() => window.open("https://github.com/darkthemehub", "_blank")}
                style={{ width: 300 }}
                cover={
                  <img
                    alt="image"
                    style={{ width: 300, height: "auto", background: "#1d1d1d" }}
                    src={`https://avatars2.githubusercontent.com/u/55282763?s=400&u=6de6bebec65ca7e8102b96d354a2da3102919da9&v=4`}
                  />
                }
                actions={[]}
              >
                <Meta
                  title="Dark Theme Hub"
                  description="Dark themes for developers"
                />
              </Card>
              <Card
                hoverable
                onClick={() => window.open("https://github.com/Snazzie/Affinity", "_blank")}
                style={{ width: 300 }}
                cover={
                  <img
                    alt="image"
                    style={{ width: 300, height: "auto", background: "#1d1d1d" }}
                    src={`https://i.gyazo.com/5a5abc0e46d96b90602fc1087a9b5863.png`}
                  />
                }
                actions={[]}
              >
                <Meta
                  title="Affinity"
                  description="Windows 10 Application Affinity (CPU Threads) Manager"
                />
              </Card>
            </div>
          </div>
        </Section>
      </ScrollingProvider>
    </>
  );
};

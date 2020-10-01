import { Layout, Menu } from 'antd';
import React from 'react';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router } from "react-router-dom";

import { Link, useLocation } from "react-router-dom";
import "./Main.css";
import SubMenu from 'antd/lib/menu/SubMenu';
const { Sider, Content } = Layout;
export const Main: React.FunctionComponent = props => {

  const [collapsed, setCollapsed] = React.useState<boolean>();

  function toggleNavbar () {
    setCollapsed(!collapsed);
  }
  const location = useLocation();
  
    return (
      <Router>
        <Layout>
        <Sider theme="dark" trigger={null} collapsible collapsed={collapsed} >
          <span>
          <div className="logo" ></div>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggleNavbar,
            })}
            </span>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={[location.pathname === "/" ? "/home" : location.pathname]}>
            <Menu.Item key="/Home" icon={<UserOutlined />}>
              Home <Link to={"/"}/>
            </Menu.Item>
            <SubMenu key="/Projects" icon={<UserOutlined />} title="Projects">
              <Menu.Item key="/Projects#GithubDarkTheme">Github Dark Theme<Link to={"/Projects#GithubDarkTheme"} /></Menu.Item>
              <Menu.Item key="/Projects#Affinity">Affinity <Link to={"/Projects#Affinity"} /></Menu.Item>
              <Menu.Item key="5">Snap Repo</Menu.Item>
              <Menu.Item key="5">Rhythm Unity</Menu.Item>
            </SubMenu>

          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Content
            className="site-layout-background"
            style={{
              margin: '24px 16px',
              padding: 24,
              minHeight: 280,
            }}
          >
            {props?.children}
          </Content>
          
        </Layout>
        </Layout>
     </Router>
    );
  
  }


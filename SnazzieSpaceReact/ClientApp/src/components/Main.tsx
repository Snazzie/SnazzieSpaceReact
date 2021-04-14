import { Layout, Menu } from "antd";
import React from "react";
import {
	MenuUnfoldOutlined,
	MenuFoldOutlined,
	UserOutlined,
	StarFilled,
} from "@ant-design/icons";
import { BrowserRouter as Router } from "react-router-dom";

import { Link, useLocation } from "react-router-dom";
import "./Main.css";
export const Main: React.FunctionComponent = (props) => {
	const [collapsed, setCollapsed] = React.useState<boolean>();

	function toggleNavbar() {
		setCollapsed(!collapsed);
	}
	const location = useLocation();

	return (
		<Router>
			{props?.children}
		</Router>
	);
};

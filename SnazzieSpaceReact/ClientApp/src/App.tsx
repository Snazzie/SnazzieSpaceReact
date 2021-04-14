import React from "react";
import { Route } from "react-router";
import { Main } from "./components/Main";

import "./custom.css";
import { Switch } from "react-router-dom";
import { Home } from "./pages/Home";

const App: React.FunctionComponent = () => {
  return (
    <Switch>
      <Main>
        <Route exact path="/" component={Home}></Route>
      </Main>
    </Switch>
  );
};
export default App;

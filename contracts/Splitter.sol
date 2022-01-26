pragma solidity ^0.8.0;

import "./SwapTool.sol";

interface IERC20
{
    function transfer(address _to, uint256 _value) external;
    function balanceOf(address) external view returns (uint256);
}

contract Splitter
{
    // This contract recieved Eth and LEVR tokens and sends them to their respective gulper contracts.

    IERC20 public constant levrErc20;
    IERC20 public constant daiErc20;
    IERC20 public constant fryErc20;

    address public constant ethGulper;
    address public constant daiGulper;
    address public constant dEthGulper;

    DaiSwapTool public constant daiSwapTool;
    FrySwapTool public constant frySwapTool;
    
    function Split() 
        public
    { 
        // goal:
        // 1. wrap all the eth
        // 2. send 47.5% of weth to wethGulper
        // 3. convert 47.5% of weth to dai
        // 4. send the dai to daiGulper
        // 5. send 1/3rd of the LEVR balance to each gulper


        // logic:
        // * wrap all the ether
        // * manage the send to the wethGulper
        // * manage the send to the daiGulper
        // * manage the send to the dEthGulper

        uint ethBalance = address(this).balance;
        uint levrBalance = levrErc20.balanceOf(address(this));
        GulpEth(ethBalance*1000/475, levrBalance);
        GulpDai(ethBalance*1000/475, levrBalance);
        GulpDeth(levrBalance);
        BurnFry(ethBalance);
    }

    function GulpEth(uint _ethBalance, uint _levrBalance)
        private
    {
        (bool success,) = ethGulper.call{ value:_ethBalance }(""); 
        require(success, "ethGulper transfer failed");
        levrErc20.transfer(ethGulper, _levrBalance);
    }

    function GulpDai(uint _ethBalance, uint _levrBalance)
        private
    {
        SwapWethForDai(_ethBalance);
        daiErc20.transfer(daiGulper, daiErc20.balanceOf(address(this)));
        levrErc20.transfer(daiGulper, _levrBalance);
    }

    function SwapWethForDai(uint _ethBalance)
        private
    {
        daiSwapTool.convertExactEthToDai{ value:_ethBalance }();
    }

    function GulpDeth(uint _levrBalance)
        private
    {
        levrErc20.transfer(dEthGulper, _levrBalance);
    }

    function BurnFry(uint _ethBalance)
        private
    {
        SwapWethForFry(_ethBalance);
        fryErc20.transfer(address(1), fryErc20.balanceOf(address(this)));
    }

    function SwapWethForFry(uint _ethBalance)
        private
    {
        frySwapTool.convertExactEthToFry{ value:_ethBalance }();
    }
}
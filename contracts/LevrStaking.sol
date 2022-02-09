pragma solidity ^0.5.16;

import "openzeppelin-solidity@2.3.0/contracts/math/Math.sol";
import "openzeppelin-solidity@2.3.0/contracts/math/SafeMath.sol";
import "openzeppelin-solidity@2.3.0/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity@2.3.0/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity@2.3.0/contracts/utils/ReentrancyGuard.sol";

// Inheritance
import "synthetix/contracts/interfaces/IStakingRewards.sol";
import "synthetix/contracts/RewardsDistributionRecipient.sol";
import "synthetix/contracts/Pausable.sol";

// https://docs.synthetix.io/contracts/source/contracts/stakingrewards
contract StakingRewards is IStakingRewards, RewardsDistributionRecipient, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public rewardsToken;
    IERC20 public stakingToken;
    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public rewardsDuration = 7 days;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) public Owned(_owner) {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        rewardsDistribution = _rewardsDistribution;
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRate).mul(1e18).div(_totalSupply)
            );
    }

    function earned(address account) public view returns (uint256) {
        return _balances[account].mul(rewardPerToken().sub(userRewardPerTokenPaid[account])).div(1e18).add(rewards[account]);
    }

    function getRewardForDuration() external view returns (uint256) {
        return rewardRate.mul(rewardsDuration);
    }

    /* == Time based staking == */
    mapping(address => uint256) public lockupTimes;

    function stake(uint256 _amount, uint _releaseDateTime) 
        external
    {
        lockupTimes[msg.sender] = Math.max(lockupTimes[msg.sender], _releaseDateTime);
        require(lockupTimes[msg.sender] >= block.timestamp.add(30 days), "Lockup period too short.");
        _stake(_amount);
    }

    function exit()
        external
    {
        require(lockupTimes[msg.sender] < block.timestamp, "staking period has not yet expired");
        _exit();
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _stake(uint256 amount) 
        internal    // modified
        nonReentrant 
        notPaused 
        updateReward(msg.sender)    
    {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function _withdraw(address receiver, uint256 amount)
        internal    // modified 
        updateReward(receiver) 
    {
        require(lockupTimes[receiver] < block.timestamp, "staking period has not yet expired");
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[receiver] = _balances[receiver].sub(amount);
        stakingToken.safeTransfer(receiver, amount);
        emit Withdrawn(receiver, amount);
    }

    function getReward(address receiver) 
        public 
        nonReentrant 
        updateReward(receiver) 
    {
        bool overGracePeriod = lockupTimes[receiver].add(gracePeriod) < block.timestamp;
        uint256 reward = rewards[receiver];
        if (reward > 0) {
            rewards[receiver] = 0;
            if(overGracePeriod) {
                uint bounty = reward.mul(10).div(100);
                reward = reward.sub(bounty);
                rewardsToken.safeTransfer(receiver, reward);      
                rewardsToken.safeTransfer(msg.sender, bounty);     
                emit RewardPaid(receiver, reward);
                emit RewardPaid(msg.sender, bounty);   

            } else {
                rewardsToken.safeTransfer(receiver, reward);
                emit RewardPaid(receiver, reward);
            }
            
            
        }
    }

    function _exit(address receiver) 
        internal    // modified
    {
        _withdraw(receiver, _balances[receiver]);
        getReward(receiver);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(uint256 reward) external onlyRewardsDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(rewardsDuration);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(rewardsDuration);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance.div(rewardsDuration), "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(rewardsDuration);
        emit RewardAdded(reward);
    }

    // Added to support recovering LP Rewards from other systems such as BAL to be distributed to holders
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAddress != address(stakingToken), "Cannot withdraw the staking token");
        IERC20(tokenAddress).safeTransfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);
    event Recovered(address token, uint256 amount);
}